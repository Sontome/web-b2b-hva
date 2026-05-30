const BASE_URL = 'https://apilive.hanvietair.com';

export interface CheckStudentRequest {
  qualtity: string;
  dep: string;
  arr: string;
  depdate: string;
  deptime: string;
  deptimedone: string;
  arrdate?: string;
  arrtime?: string;
  arrtimedone?: string;
}

export interface CheckStudentResponse {
  price?: { price?: number } | null;
  mess?: string;
}

export async function checkStudentPrice(
  payload: CheckStudentRequest
): Promise<CheckStudentResponse> {
  const res = await fetch(`${BASE_URL}/check-stu`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg =
        (j as { message?: string; detail?: string }).message ||
        (j as { detail?: string }).detail ||
        msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  return res.json() as Promise<CheckStudentResponse>;
}
