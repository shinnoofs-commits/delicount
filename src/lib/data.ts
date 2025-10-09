
import type { User, Product, Transaction, Category } from './types';

export const users: User[] = [
  { id: 'user-1', name: '管理者ユーザー', email: 'admin@swiftpos.com', role: 'admin' },
  { id: 'user-2', name: '従業員ユーザー', email: 'employee@swiftpos.com', role: 'employee' },
];

const productDefinitions: Omit<Product, 'id' | 'pricePattern'>[] = [
  // 揚げ物 (10)
  { name: '絶品コロッケ', price: 180, costPrice: 63, productCode: '000001', category: '揚げ物' },
  { name: '自家製メンチカツ', price: 220, costPrice: 88, productCode: '000003', category: '揚げ物' },
  { name: 'カニクリームコロッケ', price: 250, costPrice: 95, productCode: '000011', category: '揚げ物' },
  { name: 'アジフライ', price: 190, costPrice: 80, productCode: '000012', category: '揚げ物' },
  { name: 'イカフライ', price: 160, costPrice: 53, productCode: '000013', category: '揚げ物' },
  { name: 'チーズチキンカツ', price: 320, costPrice: 128, productCode: '000014', category: '揚げ物' },
  { name: 'エビフライ', price: 280, costPrice: 98, productCode: '000015', category: '揚げ物' },
  { name: '串カツ（豚）', price: 150, costPrice: 52, productCode: '000016', category: '揚げ物' },
  { name: 'ハムカツ', price: 130, costPrice: 45, productCode: '000017', category: '揚げ物' },
  { name: '野菜かき揚げ', price: 200, costPrice: 70, productCode: '000018', category: '揚げ物' },

  // 惣菜 (30) - 唐揚げ, サラダ, 温惣菜
  { name: 'ジューシー唐揚げ (100g)', price: 250, costPrice: 100, productCode: '000002', category: '惣菜' },
  { name: 'ヤンニョムチキン (100g)', price: 300, costPrice: 135, productCode: '000019', category: '惣菜' },
  { name: '油淋鶏（ユーリンチー）', price: 580, costPrice: 232, productCode: '000020', category: '惣菜' },
  { name: 'チキン南蛮', price: 620, costPrice: 248, productCode: '000021', category: '惣菜' },
  { name: '手羽先唐揚げ（5本）', price: 480, costPrice: 192, productCode: '000022', category: '惣菜' },
  { name: '竜田揚げ (100g)', price: 260, costPrice: 104, productCode: '000023', category: '惣菜' },
  { name: '軟骨唐揚げ', price: 350, costPrice: 140, productCode: '000024', category: '惣菜' },
  { name: '砂肝の唐揚げ', price: 320, costPrice: 128, productCode: '000025', category: '惣菜' },
  { name: 'ハーブソルト唐揚げ (100g)', price: 280, costPrice: 112, productCode: '000026', category: '惣菜' },
  { name: '塩麹唐揚げ (100g)', price: 290, costPrice: 116, productCode: '000027', category: '惣菜' },
  { name: '彩り野菜のポテトサラダ', price: 320, costPrice: 112, productCode: '000004', category: '惣菜' },
  { name: 'シーザーサラダ', price: 450, costPrice: 180, productCode: '000028', category: '惣菜' },
  { name: '豆腐とわかめの和風サラダ', price: 380, costPrice: 133, productCode: '000029', category: '惣菜' },
  { name: 'マカロニサラダ', price: 280, costPrice: 98, productCode: '000030', category: '惣菜' },
  { name: 'コールスロー', price: 250, costPrice: 87, productCode: '000031', category: '惣菜' },
  { name: '春雨サラダ', price: 300, costPrice: 120, productCode: '000032', category: '惣菜' },
  { name: '海老とアボカドのサラダ', price: 520, costPrice: 234, productCode: '000033', category: '惣菜' },
  { name: 'ごぼうサラダ', price: 290, costPrice: 101, productCode: '000034', category: '惣菜' },
  { name: '生ハムのサラダ', price: 480, costPrice: 192, productCode: '000035', category: '惣菜' },
  { name: 'かぼちゃサラダ', price: 310, costPrice: 124, productCode: '000036', category: '惣菜' },
  { name: '特製だし巻き卵', price: 480, costPrice: 168, productCode: '000007', category: '惣菜' },
  { name: '肉じゃが', price: 420, costPrice: 147, productCode: '000045', category: '惣菜' },
  { name: '筑前煮', price: 450, costPrice: 180, productCode: '000046', category: '惣菜' },
  { name: '豚の角煮', price: 680, costPrice: 272, productCode: '000047', category: '惣菜' },
  { name: '麻婆豆腐', price: 550, costPrice: 220, productCode: '000048', category: '惣菜' },
  { name: 'カレイの煮付け', price: 580, costPrice: 261, productCode: '000049', category: '惣菜' },
  { name: 'ロールキャベツ', price: 380, costPrice: 152, productCode: '000050', category: '惣菜' },
  { name: 'おでん（5種盛り）', price: 600, costPrice: 240, productCode: '000051', category: '惣菜' },
  { name: '鶏肉のトマト煮込み', price: 620, costPrice: 217, productCode: '000052', category: '惣菜' },
  { name: '牛すじ煮込み', price: 590, costPrice: 265, productCode: '000053', category: '惣菜' },

  // 弁当 (20) - 弁当, 丼
  { name: '日替わり幕の内弁当', price: 850, costPrice: 340, productCode: '000005', category: '弁当' },
  { name: 'のり弁当', price: 550, costPrice: 220, productCode: '000006', category: '弁当' },
  { name: '唐揚げ弁当', price: 680, costPrice: 272, productCode: '000037', category: '弁当' },
  { name: '生姜焼き弁当', price: 720, costPrice: 324, productCode: '000038', category: '弁当' },
  { name: 'ハンバーグ弁当', price: 780, costPrice: 312, productCode: '000039', category: '弁当' },
  { name: '鮭弁当', price: 650, costPrice: 260, productCode: '000040', category: '弁当' },
  { name: 'とんかつ弁当', price: 820, costPrice: 369, productCode: '000041', category: '弁当' },
  { name: '野菜炒め弁当', price: 600, costPrice: 240, productCode: '000042', category: '弁当' },
  { name: '中華弁当', price: 880, costPrice: 352, productCode: '000043', category: '弁当' },
  { name: 'お子様弁当', price: 500, costPrice: 175, productCode: '000044', category: '弁当' },
  { name: 'カツ丼', price: 780, costPrice: 312, productCode: '000071', category: '弁当' },
  { name: '親子丼', price: 680, costPrice: 272, productCode: '000072', category: '弁当' },
  { name: '牛丼', price: 650, costPrice: 260, productCode: '000073', category: '弁当' },
  { name: '天丼', price: 850, costPrice: 340, productCode: '000074', category: '弁当' },
  { name: '中華丼', price: 750, costPrice: 300, productCode: '000075', category: '弁当' },
  { name: '海鮮丼', price: 980, costPrice: 441, productCode: '000076', category: '弁当' },
  { name: 'ロコモコ丼', price: 820, costPrice: 328, productCode: '000077', category: '弁当' },
  { name: 'ビビンバ丼', price: 790, costPrice: 316, productCode: '000078', category: '弁当' },
  { name: '豚キムチ丼', price: 720, costPrice: 288, productCode: '000079', category: '弁当' },
  { name: 'ソースカツ丼', price: 760, costPrice: 304, productCode: '000080', category: '弁当' },

  // 冷総菜 (20) - 冷惣菜, 軽食
  { name: 'ほうれん草の胡麻和え', price: 280, costPrice: 98, productCode: '000008', category: '冷総菜' },
  { name: 'きんぴらごぼう', price: 260, costPrice: 91, productCode: '000054', category: '冷総菜' },
  { name: 'ひじきの煮物', price: 270, costPrice: 108, productCode: '000055', category: '冷総菜' },
  { name: '切り干し大根', price: 250, costPrice: 100, productCode: '000056', category: '冷総菜' },
  { name: '卯の花', price: 290, costPrice: 101, productCode: '000057', category: '冷総菜' },
  { name: 'なすの揚げ浸し', price: 320, costPrice: 128, productCode: '000058', category: '冷総菜' },
  { name: 'きゅうりとわかめの酢の物', price: 240, costPrice: 84, productCode: '000059', category: '冷総菜' },
  { name: 'もずく酢', price: 220, costPrice: 77, productCode: '000060', category: '冷総菜' },
  { name: 'ピリ辛きゅうり', price: 200, costPrice: 60, productCode: '000061', category: '冷総菜' },
  { name: '冷奴', price: 180, costPrice: 54, productCode: '000062', category: '冷総菜' },
  { name: 'おにぎり (鮭)', price: 180, costPrice: 63, productCode: '000009', category: '冷総菜' },
  { name: 'おにぎり (梅)', price: 160, costPrice: 56, productCode: '000010', category: '冷総菜' },
  { name: 'おにぎり (ツナマヨ)', price: 170, costPrice: 68, productCode: '000063', category: '冷総菜' },
  { name: 'サンドイッチ（ミックス）', price: 420, costPrice: 168, productCode: '000064', category: '冷総菜' },
  { name: 'サンドイッチ（たまご）', price: 350, costPrice: 140, productCode: '000065', category: '冷総菜' },
  { name: '焼きそばパン', price: 280, costPrice: 112, productCode: '000066', category: '冷総菜' },
  { name: 'コロッケパン', price: 250, costPrice: 100, productCode: '000067', category: '冷総菜' },
  { name: 'いなり寿司（3個）', price: 300, costPrice: 120, productCode: '000068', category: '冷総菜' },
  { name: 'フランクフルト', price: 200, costPrice: 80, productCode: '000069', category: '冷総菜' },
  { name: 'アメリカンドッグ', price: 220, costPrice: 88, productCode: '000070', category: '冷総菜' },

  // おこわ (10)
  { name: '山菜おこわ', price: 450, costPrice: 180, productCode: '000081', category: 'おこわ' },
  { name: '栗おこわ', price: 520, costPrice: 234, productCode: '000082', category: 'おこわ' },
  { name: '赤飯', price: 400, costPrice: 160, productCode: '000083', category: 'おこわ' },
  { name: '五目おこわ', price: 480, costPrice: 192, productCode: '000084', category: 'おこわ' },
  { name: '鶏おこわ', price: 490, costPrice: 196, productCode: '000085', category: 'おこわ' },
  { name: 'うなぎおこわ', price: 980, costPrice: 441, productCode: '000086', category: 'おこわ' },
  { name: 'きのこおこわ', price: 460, costPrice: 184, productCode: '000087', category: 'おこわ' },
  { name: 'たけのこおこわ', price: 500, costPrice: 225, productCode: '000088', category: 'おこわ' },
  { name: '豆おこわ', price: 430, costPrice: 172, productCode: '000089', category: 'おこわ' },
  { name: '中華おこわ', price: 550, costPrice: 220, productCode: '000090', category: 'おこわ' },
];

export const initialProducts: Product[] = productDefinitions.map((p, index) => ({
    ...p,
    id: `prod-${p.productCode || (index + 1)}-${new Date().getTime()}`,
    pricePattern: '',
}));


export const products: Product[] = initialProducts;

export const transactions: Transaction[] = [];

    
