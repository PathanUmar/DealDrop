import "@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:5173",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle browser preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "Product URL is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");

    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY is not configured");
    }

    const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: [
          {
            type: "json",
            schema: {
              type: "object",
              properties: {
                productName: {
                  type: "string",
                },
                currentPrice: {
                  type: "number",
                },
                currencyCode: {
                  type: "string",
                },
                productImageUrl: {
                  type: "string",
                },
              },
              required: [
                "productName",
                "currentPrice",
                "currencyCode",
              ],
            },
            prompt:
              "Extract information only for the main product on this page. " +
              "Return the exact product name as productName, " +
              "current selling price as a number without currency symbols as currentPrice, " +
              "currency code such as USD, EUR, GBP, or INR as currencyCode, " +
              "and the main product image URL as productImageUrl if available. " +
              "Do not extract information from recommended products, related products, ads, or other products.",
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `Firecrawl API error: ${response.status} ${errorText}`
      );
    }

    const result = await response.json();

    console.log("Firecrawl HTTP status:", response.status);
    console.log("Firecrawl response:", JSON.stringify(result));

    const extractedData = result?.data?.json;

    if (!extractedData || !extractedData.productName) {
      throw new Error("No product data extracted");
    }

    return new Response(JSON.stringify(extractedData), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Scrape error:", error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Failed to scrape product",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});