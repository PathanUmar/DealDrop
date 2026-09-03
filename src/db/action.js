import { supabase } from "@/utils/supabase";
import { scrapeProduct } from "./firecrawl";

export async function addProduct(formData) {
  const url = formData.get("url");

  if (!url) {
    return { error: "URL is required" };
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    const productData = await scrapeProduct(url);

    if (!productData.productName || !productData.currentPrice) {
      console.log(productData, "productData");
      return { error: "Could not extract product indormation from this URL" };
    }

    const newPrice = parseFloat(productData.currentPrice);
    const currency = productData.currencyCode || "USD";

    const { data: existingProduct } = await supabase
      .from("products")
      .select("id,current_price")
      .eq("user_id", user.id)
      .eq("url", url);
    //   .single();

    const isUpdate = !!existingProduct;

    const { data: product, error } = await supabase
      .from("products")
      .upsert(
        {
          user_id: user.id,
          url,
          name: productData.productName,
          current_price: newPrice,
          currency: currency,
          image_url: productData.productImageUrl,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,url",
          ignoreDuplicates: false,
        },
      )
      .select()
      .single();

    if (error) throw error;

    const shouldAddHistory =
      !isUpdate || existingProduct.current_price !== newPrice;

    if (shouldAddHistory) {
      await supabase.from("price_history").insert({
        product_id: product.id,
        price: newPrice,
        currency: currency,
      });
    }

    return {
      success: true,
      product,
      message: isUpdate
        ? "Product added successfully!"
        : "Product updated with latest price!",
    };
  } catch (error) {
    console.error("Add product error :", error);
    return { error: error.message || "Failed to add product" };
  }
}

export async function getProducts() {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Get products error :", error);
    return [];
  }
}

export async function deleteProduct(productId) {
  try {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) {
      throw error;
    }

    return {
      success: true,
      message: "delete the product!",
    };
  } catch (error) {
    return { error: error.message };
  }
}

export async function getPriceHistory(productId) {
  try {
    const { data, error } = await supabase
      .from("price_history")
      .select("*")
      .eq("product_id", productId)
      .order("checked_at", { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Get price history error :", error);
    return [];
  }
}
