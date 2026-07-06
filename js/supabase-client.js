// ============================================================
// dub — Supabase client
// Loaded after the Supabase CDN script and config.js
// ============================================================

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Uploads a doodle image (Blob or File) to Supabase Storage,
 * then inserts a row in the `doodles` table.
 *
 * @param {Blob} imageBlob - the doodle image (png/jpeg)
 * @param {Object} meta - { creatorName, category, source }
 * @returns {Object} the inserted doodle row
 */
async function saveDoodle(imageBlob, meta) {
  const fileName = `${meta.source}/${crypto.randomUUID()}.png`;

  const { error: uploadError } = await supabaseClient
    .storage
    .from("doodles")
    .upload(fileName, imageBlob, { contentType: "image/png" });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabaseClient
    .storage
    .from("doodles")
    .getPublicUrl(fileName);

  const { data, error: insertError } = await supabaseClient
    .from("doodles")
    .insert({
      creator_name: meta.creatorName || "anonymous",
      image_url: publicUrlData.publicUrl,
      category: meta.category || "organic",
      source: meta.source || "community",
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return data;
}

/**
 * Fetches doodles for the Community gallery.
 * @param {Object} opts - { category, page, pageSize }
 */
async function fetchDoodles({ category = "all", page = 1, pageSize = 20 } = {}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseClient
    .from("doodles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (category !== "all") {
    query = query.eq("category", category);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { doodles: data, total: count };
}
