// app/api/slack/youbike/route.ts
import { NextResponse } from "next/server";

interface YouBikeApiResponse {
  sno: string;
  sna: string;
  sbi: string;
  bemp: string;
  mday: string;
}

interface Station {
  sno: string;
  sna: string;
  bikesAvailable: number;
  parkingAvailable: number;
  lastUpdated: string;
}

const targets = [
  {
    url: "https://data.ntpc.gov.tw/api/datasets/010e5b15-3823-4b20-b401-b1cf000550c5/json?page=11&size=100",
    friendlyName: "捷運新北產業園區",
  },
  {
    url: "https://data.ntpc.gov.tw/api/datasets/010e5b15-3823-4b20-b401-b1cf000550c5/json?page=4&size=100",
    friendlyName: "泰博科技",
  },
];

export async function POST() {
  // Fetch data from each target URL
  const stations: Station[] = (
    await Promise.all(
      targets.map(async (target) => {
        try {
          const res = await fetch(target.url);
          if (!res.ok) {
            console.error(
              `Failed to fetch ${target.friendlyName}: ${res.status}`
            );
            return null;
          }
          const data: YouBikeApiResponse[] = await res.json();
          // Find the station matches our friendlyName
          const stationData = data.find(
            (station) => formatStationName(station.sna) === target.friendlyName
          );
          if (stationData) {
            return {
              sno: stationData.sno,
              sna: formatStationName(stationData.sna),
              bikesAvailable: parseInt(stationData.sbi, 10),
              parkingAvailable: parseInt(stationData.bemp, 10),
              lastUpdated: stationData.mday,
            };
          }
          return null;
        } catch (error) {
          console.error(
            `Error fetching data for ${target.friendlyName}:`,
            error
          );
          return null;
        }
      })
    )
  ).filter((s): s is Station => s !== null);

  if (!stations.length) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "抱歉，我現在找不到站點。",
    });
  }

  const imageUrl = `${process.env.BASE_URL}/images/happy-puppy.png`;

  const stationBlocks = stations.map((station) => ({
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*:round_pushpin: ${station.sna}*\n:bike: *可借車輛:* ${station.bikesAvailable}\n:parking: *可停空位:* ${station.parkingAvailable}`,
    },
    accessory: {
      type: "image",
      image_url: imageUrl,
      alt_text: "YouBike image",
    },
  }));

  // Compute the latest update time among all stations
  const latestTimestamp = stations.reduce((latest, station) => {
    return station.lastUpdated > latest ? station.lastUpdated : latest;
  }, stations[0].lastUpdated);

  const updateBlock = {
    type: "section",
    elements: [
      {
        type: "mrkdwn",
        text: `更新時間：${formatTimestamp(latestTimestamp)}`,
      },
    ],
  };

  // Combine the station blocks
  const blocks = [...stationBlocks, updateBlock];

  return NextResponse.json({
    response_type: "in_channel",
    blocks,
  });
}

function formatTimestamp(timestamp: string): string {
  const year = timestamp.substring(0, 4);
  const month = timestamp.substring(4, 6);
  const day = timestamp.substring(6, 8);
  const hour = timestamp.substring(8, 10);
  const minute = timestamp.substring(10, 12);
  const second = timestamp.substring(12, 14);
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function formatStationName(rawName: string): string {
  // Remove the "YouBike2.0_" prefix if present
  if (rawName.startsWith("YouBike2.0_")) {
    rawName = rawName.slice("YouBike2.0_".length);
  }
  // If the name contains parentheses, extract the text inside
  const match = rawName.match(/\(([^)]+)\)/);
  if (match) {
    return match[1];
  }
  // if it ends with "站", remove that ending
  if (rawName.endsWith("站")) {
    return rawName.slice(0, -1);
  }
  return rawName;
}
