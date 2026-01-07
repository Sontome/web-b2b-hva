export interface LowFareRequest {
  departure: string;
  arrival: string;
  sochieu: 'OW' | 'RT';
  departure_date: string;
  return_date: string;
}

export interface LowFareDay {
  ngày: string;
  giá_vé_gốc: number;
  loại_vé: string;
}

export interface LowFareResponse {
  status_code: string;
  message: string;
  body: {
    chiều_đi: LowFareDay[];
    chiều_về: LowFareDay[];
  };
}

export const searchLowFare = async (
  departure: string,
  arrival: string,
  tripType: 'OW' | 'RT',
  departureDate: string,
  returnDate: string
): Promise<LowFareResponse> => {
  try {
    const response = await fetch('https://thuhongtour.com/vj/lowfare-v2', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        departure,
        arrival,
        sochieu: tripType,
        departure_date: departureDate,
        return_date: tripType === 'RT' ? returnDate : '',
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('LowFare API error:', error);
    return {
      status_code: '500',
      message: 'Lỗi kết nối API',
      body: {
        chiều_đi: [],
        chiều_về: [],
      },
    };
  }
};
