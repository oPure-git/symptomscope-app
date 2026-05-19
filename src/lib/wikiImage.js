const WIKI_HEADERS = { 'User-Agent': 'SymptomScope/1.0 (educational health tool)' };

async function fetchWikiSummary(title) {
  const slug = encodeURIComponent(title.replace(/ /g, '_'));
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`, { headers: WIKI_HEADERS });
  if (!res.ok) return null;
  return res.json();
}

async function fetchWikiImage(conditionName) {
  const empty = { imageUrl: null, imageCaption: null, wikiUrl: null };
  try {
    const direct = await fetchWikiSummary(conditionName);
    if (direct?.thumbnail?.source) {
      return {
        imageUrl: direct.thumbnail.source,
        imageCaption: direct.description || null,
        wikiUrl: direct.content_urls?.desktop?.page || null,
      };
    }

    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(conditionName)}&srnamespace=0&srlimit=3&format=json`,
      { headers: WIKI_HEADERS }
    );
    if (!searchRes.ok) return empty;
    const searchData = await searchRes.json();
    const hits = searchData.query?.search || [];

    for (const hit of hits) {
      const page = await fetchWikiSummary(hit.title);
      if (page?.thumbnail?.source) {
        return {
          imageUrl: page.thumbnail.source,
          imageCaption: page.description || hit.title,
          wikiUrl: page.content_urls?.desktop?.page || null,
        };
      }
    }

    if (direct?.content_urls?.desktop?.page) {
      return { imageUrl: null, imageCaption: null, wikiUrl: direct.content_urls.desktop.page };
    }
    if (hits[0]) {
      const page = await fetchWikiSummary(hits[0].title);
      return { imageUrl: null, imageCaption: null, wikiUrl: page?.content_urls?.desktop?.page || null };
    }
  } catch {
    // degrade silently
  }
  return empty;
}

module.exports = { fetchWikiImage, fetchWikiSummary };
