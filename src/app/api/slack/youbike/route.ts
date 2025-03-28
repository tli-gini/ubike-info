// app/api/slack/youbike/route.ts
import { NextRequest,NextResponse } from "next/server";
interface Station {
  sna: string;
  bikesAvailable: number;
  parkingAvailable: number;
  lastUpdated: string;
}

export async function POST(request: NextRequest) {
  const response = await fetch(`${process.env.BASE_URL}/api/youbike`);
  const stations: Station[] = await response.json();

  if (!stations.length) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "抱歉，我現在找不到站點。",
    });
  }

  const imageUrl = `${process.env.BASE_URL}/images/youbike.png`;

  const blocks = stations.flatMap((station: Station) => [
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