import HomePage from '@/components/public/HomePage';
import { getSite } from '@/lib/site';

export const revalidate = 60;

export default async function Home() {
  const site = await getSite('en');
  return <HomePage initial={site} />;
}
