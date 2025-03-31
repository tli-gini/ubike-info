// app/api/youbike/route.ts
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

export async function GET() {
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

  return NextResponse.json(stations);
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
