import { request } from "./client"

export const listEntries = (from, to) => {
  return request(`/entries?from=${from}&to=${to}`);
}

export const getEntry = (date) => {
  return request(`/entries/${date}`);
}

export const saveEntry = (date, { content, mood }) => {
  return request(`/entries/${date}`, {
    method: 'PUT',
    body: { content, mood },
  });
}

export const clearEntry = (date) => {
  return request(`/entries/${date}`, {
    method: 'DELETE',
  });
}