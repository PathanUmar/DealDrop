import { supabase } from "@/utils/supabase";

export async function scrapeProduct(url) {
  try {
    const { data, error } = await supabase.functions.invoke("scrape-product", {
      body: {
        url: url,
      },
    });

    if (error) {
      console.error(error);
      return;
    }

    return data;
  } catch (error) {
    console.error("Firecrawl scrape error :", error);
    throw new Error(`Failed to scrape product: ${error.message}`);
  }
}
