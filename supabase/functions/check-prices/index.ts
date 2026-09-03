import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPriceDropAlert } from "./email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://deal-drop-kappa.vercel.app/",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    // Supabase secrets
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase environment variables are missing");
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    // Get all tracked products
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("*");

    if (productsError) {
      throw productsError;
    }

    console.log(`Found ${products.length} products to check`);

    const results = {
      total: products.length,
      updated: 0,
      failed: 0,
      priceChanges: 0,
      alertsSent: 0,
    };

    for (const product of products) {
      try {
        // Call your existing scrape-product Edge Function
        const scrapeResponse = await fetch(
          `${supabaseUrl}/functions/v1/scrape-product`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              url: product.url,
            }),
          }
        );

        const productData = await scrapeResponse.json();

        if (!scrapeResponse.ok) {
          throw new Error(
            productData?.error || "Scraping failed"
          );
        }

        if (
          productData.currentPrice === null ||
          productData.currentPrice === undefined
        ) {
          results.failed++;
          continue;
        }

        const newPrice = Number(productData.currentPrice);
        const oldPrice = Number(product.current_price);

        if (!Number.isFinite(newPrice)) {
          results.failed++;
          continue;
        }

        // Update product
        const { error: updateError } = await supabase
          .from("products")
          .update({
            current_price: newPrice,
            currency:
              productData.currencyCode || product.currency,
            name:
              productData.productName || product.name,
            image_url:
              productData.productImageUrl ||
              product.image_url,
            updated_at: new Date().toISOString(),
          })
          .eq("id", product.id);

        if (updateError) {
          throw updateError;
        }

        // Price changed
        if (
          Number.isFinite(oldPrice) &&
          oldPrice !== newPrice
        ) {
          await supabase
            .from("price_history")
            .insert({
              product_id: product.id,
              price: newPrice,
              currency:
                productData.currencyCode ||
                product.currency,
            });

          results.priceChanges++;

          // Price dropped
          if (newPrice < oldPrice) {
            const {
              data: userData,
              error: userError,
            } = await supabase.auth.admin.getUserById(
              product.user_id
            );

            if (userError) {
              console.error(
                "Could not get user:",
                userError
              );
            }

            const user = userData?.user;

            if (user?.email) {
              const emailResult =
                await sendPriceDropAlert(
                  user.email,
                  {
                    ...product,
                    name:
                      productData.productName ||
                      product.name,
                    image_url:
                      productData.productImageUrl ||
                      product.image_url,
                    currency:
                      productData.currencyCode ||
                      product.currency,
                  },
                  oldPrice,
                  newPrice
                );

              if (emailResult.success) {
                results.alertsSent++;
              }
            }
          }
        }

        results.updated++;

      } catch (error) {
        console.error(
          `Error processing product ${product.id}:`,
          error
        );

        results.failed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Price check completed",
        results,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error("Cron job error:", error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Cron job failed",
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