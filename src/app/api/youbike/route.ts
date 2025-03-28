// app/api/youbike/route.ts
import { NextResponse } from 'next/server';

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

export async function GET() {
  const res = await fetch(
    'https://data.ntpc.gov.tw/api/datasets/010e5b15-3823-4b20-b401-b1cf000550c5/json?page=0&size=100'
  );
  const data: YouBikeApiResponse[] = await res.json();

  const targetStations: Record<string, string> = {
    "500209027": "泰博科技",
    "500229015": "捷運新北產業園區",
  };

  const stationData: Station[] = data
    .filter((station) => station.sno in targetStations)
    .map((station) => ({
      sno: station.sno,
      sna: targetStations[station.sno],
      bikesAvailable: parseInt(station.sbi, 10),
      parkingAvailable: parseInt(station.bemp, 10),
      lastUpdated: station.mday,
    }));

  return NextResponse.json(stationData);
}