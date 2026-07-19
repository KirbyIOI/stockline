export const money = (n, currencySymbol = "TSh") =>
  `${currencySymbol} ${Math.round(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
