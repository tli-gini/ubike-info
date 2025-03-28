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

export async function POST() {
  const res = await fetch(
    'https://data.ntpc.gov.tw/api/datasets/010e5b15-3823-4b20-b401-b1cf000550c5/json?page=0&size=100'
  );
  const data: YouBikeApiResponse[] = await res.json();

  const targetStations: Record<string, string> = {
    "500209027": "泰博科技",
    "500229015": "捷運新北產業園區",
  };

  const stations: Station[] = data
    .filter((station) => station.sno in targetStations)
    .map((station) => ({
      sno: station.sno,
      sna: targetStations[station.sno],
      bikesAvailable: parseInt(station.sbi, 10),
      parkingAvailable: parseInt(station.bemp, 10),
      lastUpdated: station.mday,
    }));

  if (!stations.length) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "抱歉，我現在找不到站點。",
    });
  }

  const imageUrl = `${process.env.BASE_URL}/images/youbike.png`;

  const blocks = stations.flatMap((station) => [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*:round_pushpin: ${station.sna}*\n:bicycle: *可借車輛:* ${station.bikesAvailable}\n:parking: *可停空位:* ${station.parkingAvailable}`,
      },
      accessory: {
        type: "image",
        image_url: imageUrl,
        alt_text: "YouBike station",
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `更新時間：${formatTimestamp(station.lastUpdated)}`,
        },
      ],
    },
    { type: "divider" },
  ]);

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