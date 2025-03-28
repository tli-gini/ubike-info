  // app/api/youbike/route.ts
  import { NextResponse } from 'next/server';

  interface YouBikeApiResponse {
    sna: string;
    sbi: number;
    bemp: number;
    mday: string;
  }
  
  export async function GET() {
    const res = await fetch(
      'https://data.ntpc.gov.tw/api/datasets/010e5b15-3823-4b20-b401-b1cf000550c5/json?page=0&size=100'
    );
    const data: YouBikeApiResponse[] = await res.json();
  
    const targetStations: Record<string, string> = {
      "YouBike2.0_五工二五工一路口(泰博科技)": "泰博科技",
      "YouBike2.0_捷運新北產業園區站": "捷運新北產業園區",
    };
  
    const stationData = data
      .filter((station: YouBikeApiResponse) =>
        Object.keys(targetStations).includes(station.sna)
      )
      .map((station: YouBikeApiResponse) => ({
        sna: targetStations[station.sna],
        bikesAvailable: station.sbi,
        parkingAvailable: station.bemp,
        lastUpdated: station.mday,
      }));
  
    return NextResponse.json(stationData);
  }