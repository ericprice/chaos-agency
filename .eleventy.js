module.exports = function(eleventyConfig) {
  // Shuffle filter to randomize arrays (used for statements)
  eleventyConfig.addFilter("shuffle", (arr) => {
    if (!Array.isArray(arr)) return arr;
    return arr
      .map((value) => ({ sortKey: Math.random(), value }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .map((entry) => entry.value);
  });

  // Copy everything in `public/` to the output root (e.g. dist/)
  eleventyConfig.addPassthroughCopy({ "public": "." });

  // Watch public assets in dev
  eleventyConfig.addWatchTarget("public/");

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "dist"
    },
    templateFormats: ["njk", "md", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk"
  };
};
