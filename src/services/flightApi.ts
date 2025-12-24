interface SearchFormData {
  from: string;
  to: string;
  departureDate: Date | undefined;
  returnDate: Date | undefined;
  passengers: number;
  tripType: 'one_way' | 'round_trip';
}

interface VNAFlightResponse {
  status_code: number;
  trang: string;
  tổng_trang: string;
  session_key: string;
  body: Array<{
    chiều_đi: {
      hãng: string;
      id: string;
      nơi_đi: string;
      nơi_đến: string;
      giờ_cất_cánh: string;
      ngày_cất_cánh: string;
      thời_gian_bay: string;
      thời_gian_chờ: string;
      giờ_hạ_cánh: string;
      ngày_hạ_cánh: string;
      số_điểm_dừng: string;
      điểm_dừng_1: string;
      điểm_dừng_2: string;
      loại_vé: string;
    };
    chiều_về?: {
      hãng: string;
      id: string;
      nơi_đi: string;
      nơi_đến: string;
      giờ_cất_cánh: string;
      ngày_cất_cánh: string;
      thời_gian_bay: string;
      thời_gian_chờ: string;
      giờ_hạ_cánh: string;
      ngày_hạ_cánh: string;
      số_điểm_dừng: string;
      điểm_dừng_1: string;
      điểm_dừng_2: string;
      loại_vé: string;
    };
    thông_tin_chung: {
      giá_vé: string;
      giá_vé_gốc: string;
      phí_nhiên_liệu: string;
      thuế_phí_công_cộng: string;
      số_ghế_còn: string;
      hành_lý_vna: string;
    };
  }>;
}

interface VJFlightResponse {
  status_code: number;
  trang: string;
  tổng_trang: string;
  session_key: string;
  body: Array<{
    'chiều_đi': {
      hãng: string;
      id: string;
      nơi_đi: string;
      nơi_đến: string;
      giờ_cất_cánh: string;
      ngày_cất_cánh: string;
      thời_gian_bay: string;
      thời_gian_chờ: string;
      giờ_hạ_cánh: string;
      ngày_hạ_cánh: string;
      số_điểm_dừng: string;
      điểm_dừng_1: string;
      điểm_dừng_2: string;
      loại_vé: string;
      BookingKey: string;
    };
    'chiều_về'?: {
      hãng: string;
      id: string;
      nơi_đi: string;
      nơi_đến: string;
      giờ_cất_cánh: string;
      ngày_cất_cánh: string;
      thời_gian_bay: string;
      thời_gian_chờ: string;
      giờ_hạ_cánh: string;
      ngày_hạ_cánh: string;
      số_điểm_dừng: string;
      điểm_dừng_1: string;
      điểm_dừng_2: string;
      loại_vé: string;
      BookingKey: string;
    };
    thông_tin_chung: {
      giá_vé: string;
      giá_vé_gốc: string;
      phí_nhiên_liệu: string;
      thuế_phí_công_cộng: string;
      số_ghế_còn: string;
      hành_lý_vna: string;
    };
  }>;
}

export interface Flight {
  id: string;
  airline: 'VJ' | 'VNA';
  flightNumber: string;
  departure: {
    time: string;
    airport: string;
    city: string;
    date: string;
    stops: number;
  };
  arrival: {
    time: string;
    airport: string;
    city: string;
    date: string;
  };
  return?: {
    departure: {
      time: string;
      airport: string;
      city: string;
      date: string;
      stops: number;
    };
    arrival: {
      time: string;
      airport: string;
      city: string;
      date: string;
    };
    ticketClass: string;
    stops: number;
    stopInfo?: {
      stop1: string;
      waitTime: string;
    };
  };
  duration: string;
  price: number;
  currency: string;
  aircraft: string;
  availableSeats: number;
  bookingKey?: string;
  bookingKeyReturn?: string;
  ticketClass: string;
  baggageType: string;
  stopInfo?: {
    stop1: string;
    waitTime: string;
  };
}

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCityName = (code: string): string => {
  const cities: Record<string, string> = {
    // Korean airports
    'ICN': 'Incheon',
    'PUS': 'Busan',
    'TAE': 'Daegu',
    // Vietnamese airports
    'HAN': 'Hà Nội',
    'SGN': 'Hồ Chí Minh',
    'DAD': 'Đà Nẵng',
    'HPH': 'Hải Phòng',
    'VCA': 'Cần Thơ',
    'CXR': 'Nha Trang',
    'DLI': 'Đà Lạt',
    'VDH': 'Đồng Hới',
    'BMV': 'Buôn Ma Thuột',
    'VII': 'Vinh',
    'UIH': 'Quy Nhơn',
    'THD': 'Thanh Hóa',
    'PQC': 'Phú Quốc',
    'PXU': 'Pleiku',
    'HUI': 'Huế',
    'VCL': 'Tam Kỳ',
    'CAH': 'Cà Mau',
    'DIN': 'Điện Biên',
    'VKG': 'Rạch Giá',
    'TBB': 'Tuy Hòa',
    'VDO': 'Vân Đồn',
  };
  return cities[code] || code;
};

const formatDuration = (minutes: string): string => {
  const mins = parseInt(minutes);
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
};

export const fetchVietJetFlights = async (searchData: SearchFormData): Promise<Flight[]> => {
  if (!searchData.departureDate) return [];

  const requestBody = {
    dep0: searchData.from,
    arr0: searchData.to,
    depdate0: formatDate(searchData.departureDate),
    depdate1: searchData.returnDate ? formatDate(searchData.returnDate) : '',
    adt: searchData.passengers.toString(),
    chd: '0',
    inf: '0',
    sochieu: searchData.tripType === 'round_trip' ? 'RT' : 'OW'
  };

  console.log('Calling VietJet API with:', requestBody);

  try {
    const response = await fetch('https://thuhongtour.com/vj/check-ve-v2', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`VietJet API error: ${response.status}`);
    }

    const data: VJFlightResponse = await response.json();
    console.log('VietJet API response:', data);

    if (data.status_code !== 200 || !data.body) {
      return [];
    }

    return data.body.map((flight, index) => ({
      id: `vj-${flight['chiều_đi'].id}-${index}`,
      airline: 'VJ' as const,
      flightNumber: `VJ${flight['chiều_đi'].id}`,
      departure: {
        time: flight['chiều_đi'].giờ_cất_cánh,
        airport: flight['chiều_đi'].nơi_đi,
        city: getCityName(flight['chiều_đi'].nơi_đi),
        date: flight['chiều_đi'].ngày_cất_cánh,
        stops: parseInt(flight['chiều_đi'].số_điểm_dừng),
      },
      arrival: {
        time: flight['chiều_đi'].giờ_hạ_cánh,
        airport: flight['chiều_đi'].nơi_đến,
        city: getCityName(flight['chiều_đi'].nơi_đến),
        date: flight['chiều_đi'].ngày_hạ_cánh,
      },
      return: flight['chiều_về'] ? {
        departure: {
          time: flight['chiều_về'].giờ_cất_cánh,
          airport: flight['chiều_về'].nơi_đi,
          city: getCityName(flight['chiều_về'].nơi_đi),
          date: flight['chiều_về'].ngày_cất_cánh,
          stops: parseInt(flight['chiều_về'].số_điểm_dừng),
        },
        arrival: {
          time: flight['chiều_về'].giờ_hạ_cánh,
          airport: flight['chiều_về'].nơi_đến,
          city: getCityName(flight['chiều_về'].nơi_đến),
          date: flight['chiều_về'].ngày_hạ_cánh,
        },
        ticketClass: flight['chiều_về'].loại_vé,
        stops: parseInt(flight['chiều_về'].số_điểm_dừng),
        stopInfo: flight['chiều_về'].điểm_dừng_1 ? {
          stop1: flight['chiều_về'].điểm_dừng_1,
          waitTime: flight['chiều_về'].thời_gian_chờ,
        } : undefined,
      } : undefined,
      duration: formatDuration(flight['chiều_đi'].thời_gian_bay),
      price: parseInt(flight.thông_tin_chung.giá_vé),
      currency: 'VND',
      aircraft: 'Airbus A320',
      availableSeats: parseInt(flight.thông_tin_chung.số_ghế_còn),
      bookingKey: flight['chiều_đi'].BookingKey,
      bookingKeyReturn: flight['chiều_về']?.BookingKey,
      ticketClass: flight['chiều_đi'].loại_vé,
      baggageType: flight.thông_tin_chung.hành_lý_vna,
      stopInfo: flight['chiều_đi'].điểm_dừng_1 ? {
        stop1: flight['chiều_đi'].điểm_dừng_1,
        waitTime: flight['chiều_đi'].thời_gian_chờ,
      } : undefined,
    }));
  } catch (error) {
    console.error('VietJet API error:', error);
    throw error;
  }
};

export const fetchVietnamAirlinesFlights = async (searchData: SearchFormData): Promise<Flight[]> => {
  if (!searchData.departureDate) return [];

  const requestBody = {
    dep0: searchData.from,
    arr0: searchData.to,
    depdate0: formatDate(searchData.departureDate),
    depdate1: searchData.returnDate ? formatDate(searchData.returnDate) : '',
    activedVia: '0',
    activedIDT: 'ADT,VFR',
    adt: searchData.passengers.toString(),
    chd: '0',
    inf: '0',
    page: '1',
    sochieu: searchData.tripType === 'round_trip' ? 'RT' : 'OW',
    filterTimeSlideMin0: '5',
    filterTimeSlideMax0: '2355',
    filterTimeSlideMin1: '5',
    filterTimeSlideMax1: '2355',
    session_key: ''
  };

  console.log('Calling Vietnam Airlines API with:', requestBody);

  try {
    const response = await fetch('https://thuhongtour.com/vna/check-ve-v2', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Vietnam Airlines API error: ${response.status}`);
    }

    const data: VNAFlightResponse = await response.json();
    console.log('Vietnam Airlines API response:', data);

    if (data.status_code !== 200 || !data.body) {
      return [];
    }

    return data.body.map((flight, index) => ({
      id: `vna-${flight.chiều_đi.id}-${index}`,
      airline: 'VNA' as const,
      flightNumber: `VN${flight.chiều_đi.id}`,
      departure: {
        time: flight.chiều_đi.giờ_cất_cánh,
        airport: flight.chiều_đi.nơi_đi,
        city: getCityName(flight.chiều_đi.nơi_đi),
        date: flight.chiều_đi.ngày_cất_cánh,
        stops: parseInt(flight.chiều_đi.số_điểm_dừng),
      },
      arrival: {
        time: flight.chiều_đi.giờ_hạ_cánh,
        airport: flight.chiều_đi.nơi_đến,
        city: getCityName(flight.chiều_đi.nơi_đến),
        date: flight.chiều_đi.ngày_hạ_cánh,
      },
      return: flight.chiều_về ? {
        departure: {
          time: flight.chiều_về.giờ_cất_cánh,
          airport: flight.chiều_về.nơi_đi,
          city: getCityName(flight.chiều_về.nơi_đi),
          date: flight.chiều_về.ngày_cất_cánh,
          stops: parseInt(flight.chiều_về.số_điểm_dừng),
        },
        arrival: {
          time: flight.chiều_về.giờ_hạ_cánh,
          airport: flight.chiều_về.nơi_đến,
          city: getCityName(flight.chiều_về.nơi_đến),
          date: flight.chiều_về.ngày_hạ_cánh,
        },
        ticketClass: flight.chiều_về.loại_vé,
        stops: parseInt(flight.chiều_về.số_điểm_dừng),
        stopInfo: flight.chiều_về.điểm_dừng_1 ? {
          stop1: flight.chiều_về.điểm_dừng_1,
          waitTime: flight.chiều_về.thời_gian_chờ,
        } : undefined,
      } : undefined,
      duration: formatDuration(flight.chiều_đi.thời_gian_bay),
      price: parseInt(flight.thông_tin_chung.giá_vé),
      currency: 'VND',
      aircraft: 'Boeing 787',
      availableSeats: parseInt(flight.thông_tin_chung.số_ghế_còn),
      ticketClass: flight.chiều_đi.loại_vé,
      baggageType: flight.thông_tin_chung.hành_lý_vna,
      stopInfo: flight.chiều_đi.điểm_dừng_1 ? {
        stop1: flight.chiều_đi.điểm_dừng_1,
        waitTime: flight.chiều_đi.thời_gian_chờ,
      } : undefined,
    }));
  } catch (error) {
    console.error('Vietnam Airlines API error:', error);
    throw error;
  }
};
