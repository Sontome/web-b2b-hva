import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FlightSegment {
  departure_airport: string;
  arrival_airport: string;
  departure_date: string;
  departure_time?: string;
  ticket_class: 'economy' | 'business';
}

interface MonitoredFlight {
  id: string;
  user_id: string;
  airline: string;
  departure_airport: string;
  arrival_airport: string;
  departure_date: string;
  departure_time?: string;
  is_round_trip?: boolean;
  return_date?: string;
  return_time?: string;
  segments?: FlightSegment[];
  current_price: number | null;
  last_checked_at: string | null;
  check_interval_minutes: number;
  is_active: boolean;
}

async function checkVJPrice(flight: MonitoredFlight): Promise<number | null> {
  try {
    const requestBody = {
      dep0: flight.departure_airport,
      arr0: flight.arrival_airport,
      depdate0: flight.departure_date,
      depdate1: flight.is_round_trip && flight.return_date ? flight.return_date : '',
      adt: '1',
      chd: '0',
      inf: '0',
      sochieu: flight.is_round_trip ? 'RT' : 'OW'
    };

    console.log('Checking VJ price for:', requestBody);

    const response = await fetch('https://thuhongtour.com/vj/check-ve-v2', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.error('VJ API error:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.status_code !== 200 || !data.body || data.body.length === 0) {
      console.log('No flights found in VJ API response');
      return null;
    }

    console.log(`Found ${data.body.length} flights from VJ API`);

    // Filter flights by time if departure_time is specified
    let matchingFlights = data.body;
    
    if (flight.departure_time) {
      matchingFlights = data.body.filter((f: any) => {
        const departureTime = f['chiều_đi']?.giờ_cất_cánh;
        const returnTime = f['chiều_về']?.giờ_cất_cánh;
        
        // For round trip, match both departure and return times if specified
        if (flight.is_round_trip && flight.return_time) {
          return departureTime === flight.departure_time && returnTime === flight.return_time;
        }
        
        // Otherwise just match departure time
        return departureTime === flight.departure_time;
      });
      
      console.log(`Filtered to ${matchingFlights.length} flights matching time ${flight.departure_time}`);
    }

    if (matchingFlights.length === 0) {
      console.log('No matching flights found after filtering');
      return null;
    }

    // Get the cheapest price
    const prices = matchingFlights.map((f: any) => parseInt(f.thông_tin_chung?.giá_vé || 0)).filter((p: number) => p > 0);
    
    if (prices.length === 0) {
      return null;
    }
    
    const minPrice = Math.min(...prices);
    console.log(`Cheapest price found: ${minPrice} KRW`);
    return minPrice;
  } catch (error) {
    console.error('Error checking VJ price:', error);
    return null;
  }
}

async function checkVNAPrice(flight: MonitoredFlight): Promise<number | null> {
  try {
    // For multi-segment VNA flights, we need to check each segment
    // For now, we'll check the first segment as a simple implementation
    const segment = flight.segments?.[0];
    
    if (!segment) {
      return null;
    }

    const requestBody = {
      dep0: segment.departure_airport,
      arr0: segment.arrival_airport,
      depdate0: segment.departure_date,
      depdate1: '',
      activedVia: '0',
      activedIDT: segment.ticket_class === 'business' ? 'BUS' : 'ADT,VFR',
      adt: '1',
      chd: '0',
      inf: '0',
      page: '1',
      sochieu: 'OW',
      filterTimeSlideMin0: '5',
      filterTimeSlideMax0: '2355',
      filterTimeSlideMin1: '5',
      filterTimeSlideMax1: '2355',
      session_key: ''
    };

    const response = await fetch('https://thuhongtour.com/vna/check-ve-v2', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.error('VNA API error:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.status_code !== 200 || !data.body || data.body.length === 0) {
      return null;
    }

    // Filter by time if specified
    let matchingFlights = data.body;
    
    if (segment.departure_time) {
      matchingFlights = data.body.filter((f: any) => {
        const flightTime = f.chiều_đi.giờ_cất_cánh;
        return flightTime === segment.departure_time;
      });
    }

    if (matchingFlights.length === 0) {
      return null;
    }

    // Get the cheapest price
    const prices = matchingFlights.map((f: any) => parseInt(f.thông_tin_chung.giá_vé));
    return Math.min(...prices);
  } catch (error) {
    console.error('Error checking VNA price:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { flightId } = await req.json().catch(() => ({}));

    // Get flights to check
    let query = supabaseClient
      .from('monitored_flights')
      .select('*');
    
    if (flightId) {
      // Check specific flight (manual check)
      query = query.eq('id', flightId);
    } else {
      // Check all active flights (scheduled check)
      query = query.eq('is_active', true);
    }

    const { data: flights, error } = await query;

    if (error) {
      throw error;
    }

    const now = new Date();
    const results = [];

    for (const flight of flights as MonitoredFlight[]) {
      // If checking specific flight (manual), skip time check
      if (!flightId) {
        // Check if it's time to check this flight (scheduled check)
        const lastChecked = flight.last_checked_at ? new Date(flight.last_checked_at) : null;
        const intervalMs = flight.check_interval_minutes * 60 * 1000;
        
        if (lastChecked && (now.getTime() - lastChecked.getTime() < intervalMs)) {
          continue; // Not time yet
        }
      }

      // Check the price
      let newPrice: number | null = null;
      
      if (flight.airline === 'VJ') {
        newPrice = await checkVJPrice(flight);
      } else if (flight.airline === 'VNA') {
        newPrice = await checkVNAPrice(flight);
      }

      if (newPrice !== null) {
        const priceChanged = flight.current_price !== null && flight.current_price !== newPrice;
        const priceDecreased = flight.current_price !== null && newPrice < flight.current_price;
        const priceIncreased = flight.current_price !== null && newPrice > flight.current_price;
        
        // Update the flight with new price and last_checked_at
        await supabaseClient
          .from('monitored_flights')
          .update({
            current_price: newPrice,
            last_checked_at: now.toISOString(),
          })
          .eq('id', flight.id);

        results.push({
          flight_id: flight.id,
          airline: flight.airline,
          route: `${flight.departure_airport} → ${flight.arrival_airport}`,
          old_price: flight.current_price,
          new_price: newPrice,
          price_changed: priceChanged,
          price_decreased: priceDecreased,
          price_increased: priceIncreased,
          price_difference: flight.current_price !== null ? newPrice - flight.current_price : 0,
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        checked: results.length,
        results 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
