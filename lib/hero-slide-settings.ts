import "server-only";
import { serverQuery } from "./server-db";
import { DEFAULT_HOMEPAGE_SLIDE_COUNT, homepageSlideCount } from "./hero-slides";

export async function getHomepageSlideCount(): Promise<number> {
  if (!process.env.DATABASE_URL) return DEFAULT_HOMEPAGE_SLIDE_COUNT;
  try {
    const [setting] = await serverQuery<{ count: number }>(
      "select (value->>'count')::int as count from public.system_settings where key='homepage_slides'",
    );
    return homepageSlideCount(setting?.count);
  } catch (error) {
    console.error("Could not load homepage slideshow setting", error);
    return DEFAULT_HOMEPAGE_SLIDE_COUNT;
  }
}
