
import type { User, Product, Transaction, Category } from './types';
import { PlaceHolderImages } from './placeholder-images';

const getImage = (id: string) => {
  const image = PlaceHolderImages.find((img) => img.id === id);
  // If no image is found, return a default placeholder to avoid crashes
  return image || { 
    imageUrl: `https://picsum.photos/seed/${id}/400/400`, 
    imageHint: 'placeholder' 
  };
};

export const users: User[] = [
  { id: 'user-1', name: '管理者ユーザー', email: 'admin@swiftpos.com', role: 'admin' },
  { id: 'user-2', name: '従業員ユーザー', email: 'employee@swiftpos.com', role: 'employee' },
];

const productDefinitions: Omit<Product, 'imageUrl' | 'imageHint' | 'id'>[] = [
  // 揚げ物 (10)
  { name: '絶品コロッケ', price: 180, costPrice: 80, productionQuantity: 50, productCode: '000001', category: '揚げ物' },
  { name: '自家製メンチカツ', price: 220, costPrice: 100, productionQuantity: 50, productCode: '000003', category: '揚げ物' },
  { name: 'カニクリームコロッケ', price: 250, costPrice: 120, productionQuantity: 50, productCode: '000011', category: '揚げ物' },
  { name: 'アジフライ', price: 190, costPrice: 90, productionQuantity: 50, productCode: '000012', category: '揚げ物' },
  { name: 'イカフライ', price: 160, costPrice: 75, productionQuantity: 50, productCode: '000013', category: '揚げ物' },
  { name: 'チーズチキンカツ', price: 320, costPrice: 150, productionQuantity: 50, productCode: '000014', category: '揚げ物' },
  { name: 'エビフライ', price: 280, costPrice: 130, productionQuantity: 50, productCode: '000015', category: '揚げ物' },
  { name: '串カツ（豚）', price: 150, costPrice: 70, productionQuantity: 50, productCode: '000016', category: '揚げ物' },
  { name: 'ハムカツ', price: 130, costPrice: 60, productionQuantity: 50, productCode: '000017', category: '揚げ物' },
  { name: '野菜かき揚げ', price: 200, costPrice: 95, productionQuantity: 50, productCode: '000018', category: '揚げ物' },

  // 唐揚げ (10)
  { name: 'ジューシー唐揚げ (100g)', price: 250, costPrice: 120, productionQuantity: 50, productCode: '000002', category: '唐揚げ' },
  { name: 'ヤンニョムチキン (100g)', price: 300, costPrice: 140, productionQuantity: 50, productCode: '000019', category: '唐揚げ' },
  { name: '油淋鶏（ユーリンチー）', price: 580, costPrice: 280, productionQuantity: 50, productCode: '000020', category: '唐揚げ' },
  { name: 'チキン南蛮', price: 620, costPrice: 300, productionQuantity: 50, productCode: '000021', category: '唐揚げ' },
  { name: '手羽先唐揚げ（5本）', price: 480, costPrice: 220, productionQuantity: 50, productCode: '000022', category: '唐揚げ' },
  { name: '竜田揚げ (100g)', price: 260, costPrice: 125, productionQuantity: 50, productCode: '000023', category: '唐揚げ' },
  { name: '軟骨唐揚げ', price: 350, costPrice: 160, productionQuantity: 50, productCode: '000024', category: '唐揚げ' },
  { name: '砂肝の唐揚げ', price: 320, costPrice: 150, productionQuantity: 50, productCode: '000025', category: '唐揚げ' },
  { name: 'ハーブソルト唐揚げ (100g)', price: 280, costPrice: 135, productionQuantity: 50, productCode: '000026', category: '唐揚げ' },
  { name: '塩麹唐揚げ (100g)', price: 290, costPrice: 140, productionQuantity: 50, productCode: '000027', category: '唐揚げ' },

  // サラダ (10)
  { name: '彩り野菜のポテトサラダ', price: 320, costPrice: 150, productionQuantity: 50, productCode: '000004', category: 'サラダ' },
  { name: 'シーザーサラダ', price: 450, costPrice: 210, productionQuantity: 50, productCode: '000028', category: 'サラダ' },
  { name: '豆腐とわかめの和風サラダ', price: 380, costPrice: 180, productionQuantity: 50, productCode: '000029', category: 'サラダ' },
  { name: 'マカロニサラダ', price: 280, costPrice: 130, productionQuantity: 50, productCode: '000030', category: 'サラダ' },
  { name: 'コールスロー', price: 250, costPrice: 115, productionQuantity: 50, productCode: '000031', category: 'サラダ' },
  { name: '春雨サラダ', price: 300, costPrice: 140, productionQuantity: 50, productCode: '000032', category: 'サラダ' },
  { name: '海老とアボカドのサラダ', price: 520, costPrice: 250, productionQuantity: 50, productCode: '000033', category: 'サラダ' },
  { name: 'ごぼうサラダ', price: 290, costPrice: 135, productionQuantity: 50, productCode: '000034', category: 'サラダ' },
  { name: '生ハムのサラダ', price: 480, costPrice: 230, productionQuantity: 50, productCode: '000035', category: 'サラダ' },
  { name: 'かぼちゃサラダ', price: 310, costPrice: 145, productionQuantity: 50, productCode: '000036', category: 'サラダ' },

  // 弁当 (10)
  { name: '日替わり幕の内弁当', price: 850, costPrice: 450, productionQuantity: 50, productCode: '000005', category: '弁当' },
  { name: 'のり弁当', price: 550, costPrice: 280, productionQuantity: 50, productCode: '000006', category: '弁当' },
  { name: '唐揚げ弁当', price: 680, costPrice: 350, productionQuantity: 50, productCode: '000037', category: '弁当' },
  { name: '生姜焼き弁当', price: 720, costPrice: 380, productionQuantity: 50, productCode: '000038', category: '弁当' },
  { name: 'ハンバーグ弁当', price: 780, costPrice: 400, productionQuantity: 50, productCode: '000039', category: '弁当' },
  { name: '鮭弁当', price: 650, costPrice: 330, productionQuantity: 50, productCode: '000040', category: '弁当' },
  { name: 'とんかつ弁当', price: 820, costPrice: 420, productionQuantity: 50, productCode: '000041', category: '弁当' },
  { name: '野菜炒め弁当', price: 600, costPrice: 300, productionQuantity: 50, productCode: '000042', category: '弁当' },
  { name: '中華弁当', price: 880, costPrice: 460, productionQuantity: 50, productCode: '000043', category: '弁当' },
  { name: 'お子様弁当', price: 500, costPrice: 250, productionQuantity: 50, productCode: '000044', category: '弁当' },

  // 温惣菜 (10)
  { name: '特製だし巻き卵', price: 480, costPrice: 200, productionQuantity: 50, productCode: '000007', category: '温惣菜' },
  { name: '肉じゃが', price: 420, costPrice: 180, productionQuantity: 50, productCode: '000045', category: '温惣菜' },
  { name: '筑前煮', price: 450, costPrice: 200, productionQuantity: 50, productCode: '000046', category: '温惣菜' },
  { name: '豚の角煮', price: 680, costPrice: 320, productionQuantity: 50, productCode: '000047', category: '温惣菜' },
  { name: '麻婆豆腐', price: 550, costPrice: 250, productionQuantity: 50, productCode: '000048', category: '温惣菜' },
  { name: 'カレイの煮付け', price: 580, costPrice: 280, productionQuantity: 50, productCode: '000049', category: '温惣菜' },
  { name: 'ロールキャベツ', price: 380, costPrice: 170, productionQuantity: 50, productCode: '000050', category: '温惣菜' },
  { name: 'おでん（5種盛り）', price: 600, costPrice: 280, productionQuantity: 50, productCode: '000051', category: '温惣菜' },
  { name: '鶏肉のトマト煮込み', price: 620, costPrice: 300, productionQuantity: 50, productCode: '000052', category: '温惣菜' },
  { name: '牛すじ煮込み', price: 590, costPrice: 290, productionQuantity: 50, productCode: '000053', category: '温惣菜' },
  
  // 冷惣菜 (10)
  { name: 'ほうれん草の胡麻和え', price: 280, costPrice: 130, productionQuantity: 50, productCode: '000008', category: '冷惣菜' },
  { name: 'きんぴらごぼう', price: 260, costPrice: 120, productionQuantity: 50, productCode: '000054', category: '冷惣菜' },
  { name: 'ひじきの煮物', price: 270, costPrice: 125, productionQuantity: 50, productCode: '000055', category: '冷惣菜' },
  { name: '切り干し大根', price: 250, costPrice: 115, productionQuantity: 50, productCode: '000056', category: '冷惣菜' },
  { name: '卯の花', price: 290, costPrice: 135, productionQuantity: 50, productCode: '000057', category: '冷惣菜' },
  { name: 'なすの揚げ浸し', price: 320, costPrice: 150, productionQuantity: 50, productCode: '000058', category: '冷惣菜' },
  { name: 'きゅうりとわかめの酢の物', price: 240, costPrice: 110, productionQuantity: 50, productCode: '000059', category: '冷惣菜' },
  { name: 'もずく酢', price: 220, costPrice: 100, productionQuantity: 50, productCode: '000060', category: '冷惣菜' },
  { name: 'ピリ辛きゅうり', price: 200, costPrice: 90, productionQuantity: 50, productCode: '000061', category: '冷惣菜' },
  { name: '冷奴', price: 180, costPrice: 80, productionQuantity: 50, productCode: '000062', category: '冷惣菜' },

  // 軽食 (10)
  { name: 'おにぎり (鮭)', price: 180, costPrice: 70, productionQuantity: 50, productCode: '000009', category: '軽食' },
  { name: 'おにぎり (梅)', price: 160, costPrice: 60, productionQuantity: 50, productCode: '000010', category: '軽食' },
  { name: 'おにぎり (ツナマヨ)', price: 170, costPrice: 65, productionQuantity: 50, productCode: '000063', category: '軽食' },
  { name: 'サンドイッチ（ミックス）', price: 420, costPrice: 200, productionQuantity: 50, productCode: '000064', category: '軽食' },
  { name: 'サンドイッチ（たまご）', price: 350, costPrice: 160, productionQuantity: 50, productCode: '000065', category: '軽食' },
  { name: '焼きそばパン', price: 280, costPrice: 130, productionQuantity: 50, productCode: '000066', category: '軽食' },
  { name: 'コロッケパン', price: 250, costPrice: 120, productionQuantity: 50, productCode: '000067', category: '軽食' },
  { name: 'いなり寿司（3個）', price: 300, costPrice: 140, productionQuantity: 50, productCode: '000068', category: '軽食' },
  { name: 'フランクフルト', price: 200, costPrice: 90, productionQuantity: 50, productCode: '000069', category: '軽食' },
  { name: 'アメリカンドッグ', price: 220, costPrice: 100, productionQuantity: 50, productCode: '000070', category: '軽食' },

  // 丼 (10)
  { name: 'カツ丼', price: 780, costPrice: 390, productionQuantity: 50, productCode: '000071', category: '丼' },
  { name: '親子丼', price: 680, costPrice: 340, productionQuantity: 50, productCode: '000072', category: '丼' },
  { name: '牛丼', price: 650, costPrice: 320, productionQuantity: 50, productCode: '000073', category: '丼' },
  { name: '天丼', price: 850, costPrice: 420, productionQuantity: 50, productCode: '000074', category: '丼' },
  { name: '中華丼', price: 750, costPrice: 370, productionQuantity: 50, productCode: '000075', category: '丼' },
  { name: '海鮮丼', price: 980, costPrice: 500, productionQuantity: 50, productCode: '000076', category: '丼' },
  { name: 'ロコモコ丼', price: 820, costPrice: 410, productionQuantity: 50, productCode: '000077', category: '丼' },
  { name: 'ビビンバ丼', price: 790, costPrice: 390, productionQuantity: 50, productCode: '000078', category: '丼' },
  { name: '豚キムチ丼', price: 720, costPrice: 360, productionQuantity: 50, productCode: '000079', category: '丼' },
  { name: 'ソースカツ丼', price: 760, costPrice: 380, productionQuantity: 50, productCode: '000080', category: '丼' },

  // おこわ (10)
  { name: '山菜おこわ', price: 450, costPrice: 200, productionQuantity: 50, productCode: '000081', category: 'おこわ' },
  { name: '栗おこわ', price: 520, costPrice: 240, productionQuantity: 50, productCode: '000082', category: 'おこわ' },
  { name: '赤飯', price: 400, costPrice: 180, productionQuantity: 50, productCode: '000083', category: 'おこわ' },
  { name: '五目おこわ', price: 480, costPrice: 220, productionQuantity: 50, productCode: '000084', category: 'おこわ' },
  { name: '鶏おこわ', price: 490, costPrice: 230, productionQuantity: 50, productCode: '000085', category: 'おこわ' },
  { name: 'うなぎおこわ', price: 980, costPrice: 480, productionQuantity: 50, productCode: '000086', category: 'おこわ' },
  { name: 'きのこおこわ', price: 460, costPrice: 210, productionQuantity: 50, productCode: '000087', category: 'おこわ' },
  { name: 'たけのこおこわ', price: 500, costPrice: 235, productionQuantity: 50, productCode: '000088', category: 'おこわ' },
  { name: '豆おこわ', price: 430, costPrice: 190, productionQuantity: 50, productCode: '000089', category: 'おこわ' },
  { name: '中華おこわ', price: 550, costPrice: 260, productionQuantity: 50, productCode: '000090', category: 'おこわ' },
];

const imageIdMap: Record<string, string> = {
  '000001': 'croquette',
  '000003': 'menchi-katsu',
  '000002': 'karaage',
  '000004': 'potato-salad',
  '000005': 'bento-box',
  '000006': 'nori-bento',
  '000007': 'dashimaki-tamago',
  '000008': 'gomaae',
  '000009': 'onigiri-salmon',
  '000010': 'onigiri-ume',
  '000011': 'crab-croquette',
  '000012': 'fried-fish',
  '000013': 'fried-squid',
  '000014': 'cheese-cutlet',
  '000015': 'fried-shrimp',
  '000016': 'pork-skewer',
  '000017': 'ham-cutlet',
  '000018': 'veg-fritter',
  '000019': 'korean-chicken',
  '000020': 'yurinchi',
  '000021': 'chicken-nanban',
  '000022': 'chicken-wings',
  '000023': 'tatsutaage',
  '000024': 'cartilage-karaage',
  '000025': 'gizzard-karaage',
  '000026': 'herb-chicken',
  '000027': 'shiokoji-chicken',
  '000028': 'caesar-salad',
  '000029': 'tofu-salad',
  '000030': 'macaroni-salad',
  '000031': 'coleslaw',
  '000032': 'noodle-salad',
  '000033': 'shrimp-avocado',
  '000034': 'burdock-salad',
  '000035': 'prosciutto-salad',
  '000036': 'pumpkin-salad',
  '000037': 'karaage-bento',
  '000038': 'ginger-pork',
  '000039': 'hamburg-bento',
  '000040': 'salmon-bento',
  '000041': 'tonkatsu-bento',
  '000042': 'stir-fry',
  '000043': 'chinese-bento',
  '000044': 'kids-bento',
  '000045': 'niku-jaga',
  '000046': 'chikuzenni',
  '000047': 'pork-belly',
  '000048': 'mapo-tofu',
  '000049': 'simmered-fish',
  '000050': 'cabbage-rolls',
  '000051': 'oden',
  '000052': 'chicken-stew',
  '000053': 'beef-tendon',
  '000054': 'kinpira',
  '000055': 'hijiki',
  '000056': 'daikon',
  '000057': 'unohana',
  '000058': 'fried-eggplant',
  '000059': 'sunomono',
  '000060': 'mozuku',
  '000061': 'spicy-cucumber',
  '000062': 'cold-tofu',
  '000063': 'tuna-onigiri',
  '000064': 'sandwich-mix',
  '000065': 'egg-sandwich',
  '000066': 'yakisoba-pan',
  '000067': 'croquette-pan',
  '000068': 'inari-sushi',
  '000069': 'frankfurter',
  '000070': 'corn-dog',
  '000071': 'katsudon',
  '000072': 'oyakodon',
  '000073': 'gyudon',
  '000074': 'tendon',
  '000075': 'chukadon',
  '000076': 'kaisendon',
  '000077': 'locomoco',
  '000078': 'bibimbap',
  '000079': 'pork-kimchi',
  '000080': 'sauce-katsudon',
  '000081': 'sansai-okowa',
  '000082': 'chestnut-okowa',
  '000083': 'sekihan',
  '000084': 'gomoku-okowa',
  '000085': 'chicken-okowa',
  '000086': 'eel-okowa',
  '000087': 'mushroom-okowa',
  '000088': 'bamboo-okowa',
  '000089': 'bean-okowa',
  '000090': 'chinese-okowa',
};

export const products: Product[] = productDefinitions.map((p, index) => {
    const imageInfo = getImage(imageIdMap[p.productCode] || p.productCode);
    return {
        ...p,
        id: `prod-${index + 1}`,
        imageUrl: imageInfo.imageUrl,
        imageHint: imageInfo.imageHint,
    }
});


export const transactions: Transaction[] = [];




    
