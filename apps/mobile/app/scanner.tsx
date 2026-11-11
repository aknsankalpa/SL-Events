import { Redirect } from "expo-router";

/**
 * The old ticket scanner's address. Tickets are checked by the website now, in the door-staff area, which signs the
 * person in and shows only the events they work; anything that still opens "/scanner" lands there.
 */
export default function Scanner() {
  return <Redirect href="/staff/scan" />;
}
