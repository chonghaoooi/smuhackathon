const clampScore = (value) => Math.min(100, Math.max(0, Math.round(value)));

export const demoPortfolio = {
  owner: "Alex Tan",
  sessionMinutes: 42,
  trades: [
    { ticker: "CBXT", action: "BUY", price: 122, earlierPrice: 100, recentLow: 98, recentHigh: 123, minutes: 0 },
    { ticker: "CBXT", action: "BUY", price: 105, earlierPrice: 104, recentLow: 100, recentHigh: 110, minutes: 8 },
    { ticker: "CBXT", action: "BUY", price: 91, earlierPrice: 94, recentLow: 88, recentHigh: 106, minutes: 18 },
    { ticker: "CBXT", action: "BUY", price: 82, earlierPrice: 86, recentLow: 79, recentHigh: 98, minutes: 29 },
    { ticker: "NVDA", action: "BUY", price: 154, earlierPrice: 130, recentLow: 127, recentHigh: 156, minutes: 36 },
    { ticker: "CBXT", action: "SELL", price: 84, earlierPrice: 82, recentLow: 79, recentHigh: 98, minutes: 42 },
  ],
  holdings: [
    { ticker: "CBXT", sector: "Technology", value: 3800 },
    { ticker: "NVDA", sector: "Technology", value: 2600 },
    { ticker: "MSFT", sector: "Technology", value: 1400 },
    { ticker: "DBS", sector: "Financials", value: 1200 },
    { ticker: "SIA", sector: "Industrials", value: 1000 },
  ],
};

const getState = (score) => {
  if (score <= 20) return "ZEN INVESTOR";
  if (score <= 40) return "MILDLY QUESTIONABLE";
  if (score <= 60) return "CONCERNED";
  if (score <= 80) return "DENIAL";
  return "EMOTIONAL DAMAGE";
};

export function analysePortfolio(portfolio = demoPortfolio) {
  const buys = portfolio.trades.filter((trade) => trade.action === "BUY");
  const fomoEvents = buys
    .map((trade) => ({
      ...trade,
      recentReturn: trade.earlierPrice ? trade.price / trade.earlierPrice - 1 : 0,
      rangePosition: trade.recentHigh === trade.recentLow ? 0 : (trade.price - trade.recentLow) / (trade.recentHigh - trade.recentLow),
    }))
    .filter((trade) => trade.recentReturn >= 0.15 && trade.rangePosition >= 0.9);
  const fomoScore = clampScore(fomoEvents.length * 38 + Math.max(0, fomoEvents.length - 1) * 6);

  const buysByTicker = Object.groupBy(buys, (trade) => trade.ticker);
  const decliningSequences = Object.entries(buysByTicker)
    .map(([ticker, trades]) => ({ ticker, prices: trades.map((trade) => trade.price) }))
    .filter(({ prices }) => prices.length >= 3 && prices.every((price, index) => index === 0 || price < prices[index - 1]));
  const longestSequence = Math.max(0, ...decliningSequences.map(({ prices }) => prices.length));
  const averagingDownScore = clampScore(longestSequence >= 3 ? 35 + (longestSequence - 2) * 22 : 0);

  const totalValue = portfolio.holdings.reduce((sum, holding) => sum + holding.value, 0);
  const sectorValues = portfolio.holdings.reduce((result, holding) => {
    result[holding.sector] = (result[holding.sector] || 0) + holding.value;
    return result;
  }, {});
  const topHolding = [...portfolio.holdings].sort((a, b) => b.value - a.value)[0];
  const topSector = Object.entries(sectorValues).sort((a, b) => b[1] - a[1])[0];
  const topHoldingWeight = topHolding.value / totalValue;
  const topSectorWeight = topSector[1] / totalValue;
  const hhi = portfolio.holdings.reduce((sum, holding) => sum + (holding.value / totalValue) ** 2, 0);
  const concentrationScore = clampScore(topSectorWeight * 100 + (topHoldingWeight > 0.35 ? 15 : 0) + hhi * 18);

  const sortedMinutes = portfolio.trades.map((trade) => trade.minutes).sort((a, b) => a - b);
  const gaps = sortedMinutes.slice(1).map((minute, index) => minute - sortedMinutes[index]);
  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const medianGap = sortedGaps.length ? sortedGaps[Math.floor(sortedGaps.length / 2)] : 0;
  const tradesPerHour = portfolio.trades.length / (portfolio.sessionMinutes / 60);
  const overtradingScore = clampScore(tradesPerHour * 5.2 + (medianGap < 10 ? 25 : 0));

  const findings = [
    {
      id: "fomo",
      label: "FOMO buying",
      score: fomoScore,
      tone: "hot",
      summary: `${fomoEvents.length} purchase${fomoEvents.length === 1 ? "" : "s"} followed a ≥15% rally near the recent high.`,
      roast: `You waited for ${fomoEvents[0]?.ticker || "the stock"} to sprint uphill before deciding it looked approachable.`,
      serious: "These purchases followed strong recent gains and occurred near the top of their recent ranges, a pattern consistent with performance chasing.",
      evidence: fomoEvents.length ? [
        `${fomoEvents[0].ticker} bought at $${fomoEvents[0].price.toFixed(0)}`,
        `Recent increase +${(fomoEvents[0].recentReturn * 100).toFixed(0)}%`,
        `Range position ${(fomoEvents[0].rangePosition * 100).toFixed(0)}%`,
      ] : ["No qualifying purchases detected"],
      breakdown: `${fomoEvents.length} trigger × 38 points`,
    },
    {
      id: "averagingDown",
      label: "Averaging down",
      score: averagingDownScore,
      tone: "violet",
      summary: `${longestSequence} consecutive purchases were made as the price declined.`,
      roast: "You did not change your thesis. You simply changed the price you were willing to be wrong at.",
      serious: "The position was increased multiple times while its price declined. This may be intentional; the detector identifies the pattern without judging the strategy.",
      evidence: decliningSequences.length ? [
        `${decliningSequences[0].ticker} repeated purchases`,
        decliningSequences[0].prices.map((price) => `$${price}`).join(" → "),
        `${longestSequence} declining entries`,
      ] : ["No declining purchase sequence detected"],
      breakdown: `35 base + ${Math.max(0, longestSequence - 2)} repeat bonus`,
    },
    {
      id: "concentration",
      label: "Concentration",
      score: concentrationScore,
      tone: "cyan",
      summary: `${(topSectorWeight * 100).toFixed(0)}% of portfolio value sits in ${topSector[0]}.`,
      roast: `You own ${portfolio.holdings.length} companies, but ${topSector[0]} still became the main character.`,
      serious: `Multiple securities are held, but ${(topSectorWeight * 100).toFixed(0)}% share the ${topSector[0]} sector, so underlying exposure remains concentrated.`,
      evidence: [
        `${topSector[0]} ${(topSectorWeight * 100).toFixed(0)}%`,
        `${topHolding.ticker} ${(topHoldingWeight * 100).toFixed(0)}%`,
        `HHI ${hhi.toFixed(2)}`,
      ],
      breakdown: "Sector weight + holding and HHI adjustments",
    },
    {
      id: "overtrading",
      label: "Overtrading",
      score: overtradingScore,
      tone: "blue",
      summary: `${portfolio.trades.length} trades in ${portfolio.sessionMinutes} minutes (${tradesPerHour.toFixed(1)}/hour).`,
      roast: `Your long-term strategy survived approximately ${medianGap} minutes at a time.`,
      serious: "Trading frequency is high relative to the session duration. This does not imply poor decisions, but it may reflect a reactive strategy.",
      evidence: [
        `${portfolio.trades.length} total trades`,
        `${tradesPerHour.toFixed(1)} trades per hour`,
        `${medianGap} min median gap`,
      ],
      breakdown: "Frequency rate + short-gap adjustment",
    },
  ];

  const score = Math.round(findings.reduce((sum, finding) => sum + finding.score, 0) / findings.length);
  return { owner: portfolio.owner, score, state: getState(score), findings };
}
