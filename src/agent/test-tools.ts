import { DelicountDataService } from './data-service';

async function main() {
  const service = new DelicountDataService();

  console.log('=== 1. 店舗マスタ ===');
  console.log(service.getStores());

  console.log('\n=== 2. 本厚木店 POS取引データ集計 ===');
  const res = service.analyzeHonAtsugiPOS();
  console.log(`店舗: ${res.storeName}`);
  console.log(`対象期間: ${res.period}`);
  console.log(`総販売点数: ${res.totalSalesCount} 点 / 売上金額: ￥${res.totalSalesAmount.toLocaleString()}`);
  console.log(`定価販売率: ${res.regularSalesRate}% (定価点数: ${res.regularSalesCount} / 値引き点数: ${res.discountSalesCount})`);
  console.log(`総値引き損失額: ￥${res.totalDiscountLoss.toLocaleString()}`);

  console.log('\n=== 3. 値引きワースト上位5品 ===');
  res.topDiscountedProducts.slice(0, 5).forEach(p => {
    console.log(`  第${p.rank}位: ${p.productName} [${p.department}] - 販売${p.salesCount}点中 値引き${p.discountCount}点 (${p.discountRate}%) / 損失￥${p.totalDiscountAmount.toLocaleString()}`);
  });

  console.log('\n=== 4. 時間帯別値引き集中トップ3 ===');
  res.hourlyDiscountDistribution.slice(0, 3).forEach(h => {
    console.log(`  ${h.hour}台: 値引き点数 ${h.count}点 / 損失￥${h.discountAmount.toLocaleString()} (全体の${h.percentage}%)`);
  });

  console.log('\n=== 5. 廃棄抑制・製造最適化インサイト ===');
  const opt = service.getWasteOptimization('hon-atsugi');
  console.log('過剰製造アラート品目:');
  opt.overproductionAlerts.forEach(a => {
    console.log(`  ・${a.productName}: ${a.recommendation}`);
  });
  console.log('攻めの増産推奨品目:');
  opt.opportunityGainers.forEach(g => {
    console.log(`  ・${g.productName}: ${g.recommendation}`);
  });
}

main().catch(console.error);
