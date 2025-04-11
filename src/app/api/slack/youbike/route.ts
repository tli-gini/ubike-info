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

export async function POST(req: Request) {
  let formData: FormData | URLSearchParams;

  try {
    formData = await req.formData();
  } catch {
    const bodyText = await req.text();
    formData = new URLSearchParams(bodyText);
  }

  // Now get the response_url from the parsed form data
  const responseUrl = formData.get("response_url");

  // Immediately send a loading message to Slack using response_url
  if (responseUrl && typeof responseUrl === "string") {
    fetch(responseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        response_type: "ephemeral",
        text: "🚴‍♀️ TD YouBikeBot 正在查詢資料中，請稍候...",
      }),
    });
  }
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
          // Find the station that matches our friendlyName
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
    // If no stations were found, send a final error message to Slack.
    if (responseUrl && typeof responseUrl === "string") {
      await fetch(responseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response_type: "ephemeral",
          text: "抱歉，我現在找不到站點。",
        }),
      });
    }
    return NextResponse.json({});
  }

  const imageUrl = `${process.env.BASE_URL}/images/puppy.png`;

  const stationBlocks = stations.map((station) => ({
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*:round_pushpin: ${station.sna}*\n:bike: *可借車輛:* ${station.bikesAvailable}\n:parking: *可停空位:* ${station.parkingAvailable}`,
    },
  }));

  const imageBlock = {
    type: "image",
    image_url: imageUrl,
    alt_text: "YouBike image",
  };

  // Compute the latest update time among all stations
  const latestTimestamp = stations.reduce((latest, station) => {
    return station.lastUpdated > latest ? station.lastUpdated : latest;
  }, stations[0].lastUpdated);

  // Use a context block for smaller font
  const updateBlock = {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `更新時間：${formatTimestamp(latestTimestamp)}`,
      },
    ],
  };

  // Combine the station blocks with the update time
  const blocks = [...stationBlocks, imageBlock, updateBlock];

  // Send the final message to Slack via the response_url
  if (responseUrl && typeof responseUrl === "string") {
    await fetch(responseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        response_type: "in_channel",
        blocks,
      }),
    });
  }

  return NextResponse.json({});
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
  if (rawName.startsWith("YouBike2.0_")) {
    rawName = rawName.slice("YouBike2.0_".length);
  }
  const match = rawName.match(/\(([^)]+)\)/);
  if (match) {
    return match[1];
  }
  if (rawName.endsWith("站")) {
    return rawName.slice(0, -1);
  }
  return rawName;
}
