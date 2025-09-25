
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

export const products: Product[] = [
  // 揚げ物 (10)
  { id: 'prod-1', name: '絶品コロッケ', price: 180, costPrice: 80, productionQuantity: 50, productCode: '000001', category: '揚げ物', imageUrl: getImage('croquette').imageUrl, imageHint: getImage('croquette').imageHint },
  { id: 'prod-2', name: '自家製メンチカツ', price: 220, costPrice: 100, productionQuantity: 50, productCode: '000003', category: '揚げ物', imageUrl: getImage('menchi-katsu').imageUrl, imageHint: getImage('menchi-katsu').imageHint },
  { id: 'prod-11', name: 'カニクリームコロッケ', price: 250, costPrice: 120, productionQuantity: 50, productCode: '000011', category: '揚げ物', imageUrl: getImage('crab-croquette').imageUrl, imageHint: getImage('crab-croquette').imageHint },
  { id: 'prod-12', name: 'アジフライ', price: 190, costPrice: 90, productionQuantity: 50, productCode: '000012', category: '揚げ物', imageUrl: getImage('fried-fish').imageUrl, imageHint: getImage('fried-fish').imageHint },
  { id: 'prod-13', name: 'イカフライ', price: 160, costPrice: 75, productionQuantity: 50, productCode: '000013', category: '揚げ物', imageUrl: getImage('fried-squid').imageUrl, imageHint: getImage('fried-squid').imageHint },
  { id: 'prod-14', name: 'チーズチキンカツ', price: 320, costPrice: 150, productionQuantity: 50, productCode: '000014', category: '揚げ物', imageUrl: getImage('cheese-cutlet').imageUrl, imageHint: getImage('cheese-cutlet').imageHint },
  { id: 'prod-15', name: 'エビフライ', price: 280, costPrice: 130, productionQuantity: 50, productCode: '000015', category: '揚げ物', imageUrl: getImage('fried-shrimp').imageUrl, imageHint: getImage('fried-shrimp').imageHint },
  { id: 'prod-16', name: '串カツ（豚）', price: 150, costPrice: 70, productionQuantity: 50, productCode: '000016', category: '揚げ物', imageUrl: getImage('pork-skewer').imageUrl, imageHint: getImage('pork-skewer').imageHint },
  { id: 'prod-17', name: 'ハムカツ', price: 130, costPrice: 60, productionQuantity: 50, productCode: '000017', category: '揚げ物', imageUrl: getImage('ham-cutlet').imageUrl, imageHint: getImage('ham-cutlet').imageHint },
  { id: 'prod-18', name: '野菜かき揚げ', price: 200, costPrice: 95, productionQuantity: 50, productCode: '000018', category: '揚げ物', imageUrl: getImage('veg-fritter').imageUrl, imageHint: getImage('veg-fritter').imageHint },

  // 唐揚げ (10)
  { id: 'prod-3', name: 'ジューシー唐揚げ (100g)', price: 250, costPrice: 120, productionQuantity: 50, productCode: '000002', category: '唐揚げ', imageUrl: getImage('karaage').imageUrl, imageHint: getImage('karaage').imageHint },
  { id: 'prod-19', name: 'ヤンニョムチキン (100g)', price: 300, costPrice: 140, productionQuantity: 50, productCode: '000019', category: '唐揚げ', imageUrl: getImage('korean-chicken').imageUrl, imageHint: getImage('korean-chicken').imageHint },
  { id: 'prod-20', name: '油淋鶏（ユーリンチー）', price: 580, costPrice: 280, productionQuantity: 50, productCode: '000020', category: '唐揚げ', imageUrl: getImage('yurinchi').imageUrl, imageHint: getImage('yurinchi').imageHint },
  { id: 'prod-21', name: 'チキン南蛮', price: 620, costPrice: 300, productionQuantity: 50, productCode: '000021', category: '唐揚げ', imageUrl: getImage('chicken-nanban').imageUrl, imageHint: getImage('chicken-nanban').imageHint },
  { id: 'prod-22', name: '手羽先唐揚げ（5本）', price: 480, costPrice: 220, productionQuantity: 50, productCode: '000022', category: '唐揚げ', imageUrl: getImage('chicken-wings').imageUrl, imageHint: getImage('chicken-wings').imageHint },
  { id: 'prod-23', name: '竜田揚げ (100g)', price: 260, costPrice: 125, productionQuantity: 50, productCode: '000023', category: '唐揚げ', imageUrl: getImage('tatsutaage').imageUrl, imageHint: getImage('tatsutaage').imageHint },
  { id: 'prod-24', name: '軟骨唐揚げ', price: 350, costPrice: 160, productionQuantity: 50, productCode: '000024', category: '唐揚げ', imageUrl: getImage('cartilage-karaage').imageUrl, imageHint: getImage('cartilage-karaage').imageHint },
  { id: 'prod-25', name: '砂肝の唐揚げ', price: 320, costPrice: 150, productionQuantity: 50, productCode: '000025', category: '唐揚げ', imageUrl: getImage('gizzard-karaage').imageUrl, imageHint: getImage('gizzard-karaage').imageHint },
  { id: 'prod-26', name: 'ハーブソルト唐揚げ (100g)', price: 280, costPrice: 135, productionQuantity: 50, productCode: '000026', category: '唐揚げ', imageUrl: getImage('herb-chicken').imageUrl, imageHint: getImage('herb-chicken').imageHint },
  { id: 'prod-27', name: '塩麹唐揚げ (100g)', price: 290, costPrice: 140, productionQuantity: 50, productCode: '000027', category: '唐揚げ', imageUrl: getImage('shiokoji-chicken').imageUrl, imageHint: getImage('shiokoji-chicken').imageHint },

  // サラダ (10)
  { id: 'prod-4', name: '彩り野菜のポテトサラダ', price: 320, costPrice: 150, productionQuantity: 50, productCode: '000004', category: 'サラダ', imageUrl: getImage('potato-salad').imageUrl, imageHint: getImage('potato-salad').imageHint },
  { id: 'prod-28', name: 'シーザーサラダ', price: 450, costPrice: 210, productionQuantity: 50, productCode: '000028', category: 'サラダ', imageUrl: getImage('caesar-salad').imageUrl, imageHint: getImage('caesar-salad').imageHint },
  { id: 'prod-29', name: '豆腐とわかめの和風サラダ', price: 380, costPrice: 180, productionQuantity: 50, productCode: '000029', category: 'サラダ', imageUrl: getImage('tofu-salad').imageUrl, imageHint: getImage('tofu-salad').imageHint },
  { id: 'prod-30', name: 'マカロニサラダ', price: 280, costPrice: 130, productionQuantity: 50, productCode: '000030', category: 'サラダ', imageUrl: getImage('macaroni-salad').imageUrl, imageHint: getImage('macaroni-salad').imageHint },
  { id: 'prod-31', name: 'コールスロー', price: 250, costPrice: 115, productionQuantity: 50, productCode: '000031', category: 'サラダ', imageUrl: getImage('coleslaw').imageUrl, imageHint: getImage('coleslaw').imageHint },
  { id: 'prod-32', name: '春雨サラダ', price: 300, costPrice: 140, productionQuantity: 50, productCode: '000032', category: 'サラダ', imageUrl: getImage('noodle-salad').imageUrl, imageHint: getImage('noodle-salad').imageHint },
  { id: 'prod-33', name: '海老とアボカドのサラダ', price: 520, costPrice: 250, productionQuantity: 50, productCode: '000033', category: 'サラダ', imageUrl: getImage('shrimp-avocado').imageUrl, imageHint: getImage('shrimp-avocado').imageHint },
  { id: 'prod-34', name: 'ごぼうサラダ', price: 290, costPrice: 135, productionQuantity: 50, productCode: '000034', category: 'サラダ', imageUrl: getImage('burdock-salad').imageUrl, imageHint: getImage('burdock-salad').imageHint },
  { id: 'prod-35', name: '生ハムのサラダ', price: 480, costPrice: 230, productionQuantity: 50, productCode: '000035', category: 'サラダ', imageUrl: getImage('prosciutto-salad').imageUrl, imageHint: getImage('prosciutto-salad').imageHint },
  { id: 'prod-36', name: 'かぼちゃサラダ', price: 310, costPrice: 145, productionQuantity: 50, productCode: '000036', category: 'サラダ', imageUrl: getImage('pumpkin-salad').imageUrl, imageHint: getImage('pumpkin-salad').imageHint },

  // 弁当 (10)
  { id: 'prod-5', name: '日替わり幕の内弁当', price: 850, costPrice: 450, productionQuantity: 50, productCode: '000005', category: '弁当', imageUrl: getImage('bento-box').imageUrl, imageHint: getImage('bento-box').imageHint },
  { id: 'prod-6', name: 'のり弁当', price: 550, costPrice: 280, productionQuantity: 50, productCode: '000006', category: '弁当', imageUrl: getImage('nori-bento').imageUrl, imageHint: getImage('nori-bento').imageHint },
  { id: 'prod-37', name: '唐揚げ弁当', price: 680, costPrice: 350, productionQuantity: 50, productCode: '000037', category: '弁当', imageUrl: getImage('karaage-bento').imageUrl, imageHint: getImage('karaage-bento').imageHint },
  { id: 'prod-38', name: '生姜焼き弁当', price: 720, costPrice: 380, productionQuantity: 50, productCode: '000038', category: '弁当', imageUrl: getImage('ginger-pork').imageUrl, imageHint: getImage('ginger-pork').imageHint },
  { id: 'prod-39', name: 'ハンバーグ弁当', price: 780, costPrice: 400, productionQuantity: 50, productCode: '000039', category: '弁当', imageUrl: getImage('hamburg-bento').imageUrl, imageHint: getImage('hamburg-bento').imageHint },
  { id: 'prod-40', name: '鮭弁当', price: 650, costPrice: 330, productionQuantity: 50, productCode: '000040', category: '弁当', imageUrl: getImage('salmon-bento').imageUrl, imageHint: getImage('salmon-bento').imageHint },
  { id: 'prod-41', name: 'とんかつ弁当', price: 820, costPrice: 420, productionQuantity: 50, productCode: '000041', category: '弁当', imageUrl: getImage('tonkatsu-bento').imageUrl, imageHint: getImage('tonkatsu-bento').imageHint },
  { id: 'prod-42', name: '野菜炒め弁当', price: 600, costPrice: 300, productionQuantity: 50, productCode: '000042', category: '弁当', imageUrl: getImage('stir-fry').imageUrl, imageHint: getImage('stir-fry').imageHint },
  { id: 'prod-43', name: '中華弁当', price: 880, costPrice: 460, productionQuantity: 50, productCode: '000043', category: '弁当', imageUrl: getImage('chinese-bento').imageUrl, imageHint: getImage('chinese-bento').imageHint },
  { id: 'prod-44', name: 'お子様弁当', price: 500, costPrice: 250, productionQuantity: 50, productCode: '000044', category: '弁当', imageUrl: getImage('kids-bento').imageUrl, imageHint: getImage('kids-bento').imageHint },

  // 温惣菜 (10)
  { id: 'prod-7', name: '特製だし巻き卵', price: 480, costPrice: 200, productionQuantity: 50, productCode: '000007', category: '温惣菜', imageUrl: getImage('dashimaki-tamago').imageUrl, imageHint: getImage('dashimaki-tamago').imageHint },
  { id: 'prod-45', name: '肉じゃが', price: 420, costPrice: 180, productionQuantity: 50, productCode: '000045', category: '温惣菜', imageUrl: getImage('niku-jaga').imageUrl, imageHint: getImage('niku-jaga').imageHint },
  { id: 'prod-46', name: '筑前煮', price: 450, costPrice: 200, productionQuantity: 50, productCode: '000046', category: '温惣菜', imageUrl: getImage('chikuzenni').imageUrl, imageHint: getImage('chikuzenni').imageHint },
  { id: 'prod-47', name: '豚の角煮', price: 680, costPrice: 320, productionQuantity: 50, productCode: '000047', category: '温惣菜', imageUrl: getImage('pork-belly').imageUrl, imageHint: getImage('pork-belly').imageHint },
  { id: 'prod-48', name: '麻婆豆腐', price: 550, costPrice: 250, productionQuantity: 50, productCode: '000048', category: '温惣菜', imageUrl: getImage('mapo-tofu').imageUrl, imageHint: getImage('mapo-tofu').imageHint },
  { id: 'prod-49', name: 'カレイの煮付け', price: 580, costPrice: 280, productionQuantity: 50, productCode: '000049', category: '温惣菜', imageUrl: getImage('simmered-fish').imageUrl, imageHint: getImage('simmered-fish').imageHint },
  { id: 'prod-50', name: 'ロールキャベツ', price: 380, costPrice: 170, productionQuantity: 50, productCode: '000050', category: '温惣菜', imageUrl: getImage('cabbage-rolls').imageUrl, imageHint: getImage('cabbage-rolls').imageHint },
  { id: 'prod-51', name: 'おでん（5種盛り）', price: 600, costPrice: 280, productionQuantity: 50, productCode: '000051', category: '温惣菜', imageUrl: getImage('oden').imageUrl, imageHint: getImage('oden').imageHint },
  { id: 'prod-52', name: '鶏肉のトマト煮込み', price: 620, costPrice: 300, productionQuantity: 50, productCode: '000052', category: '温惣菜', imageUrl: getImage('chicken-stew').imageUrl, imageHint: getImage('chicken-stew').imageHint },
  { id: 'prod-53', name: '牛すじ煮込み', price: 590, costPrice: 290, productionQuantity: 50, productCode: '000053', category: '温惣菜', imageUrl: getImage('beef-tendon').imageUrl, imageHint: getImage('beef-tendon').imageHint },
  
  // 冷惣菜 (10)
  { id: 'prod-8', name: 'ほうれん草の胡麻和え', price: 280, costPrice: 130, productionQuantity: 50, productCode: '000008', category: '冷惣菜', imageUrl: getImage('gomaae').imageUrl, imageHint: getImage('gomaae').imageHint },
  { id: 'prod-54', name: 'きんぴらごぼう', price: 260, costPrice: 120, productionQuantity: 50, productCode: '000054', category: '冷惣菜', imageUrl: getImage('kinpira').imageUrl, imageHint: getImage('kinpira').imageHint },
  { id: 'prod-55', name: 'ひじきの煮物', price: 270, costPrice: 125, productionQuantity: 50, productCode: '000055', category: '冷惣菜', imageUrl: getImage('hijiki').imageUrl, imageHint: getImage('hijiki').imageHint },
  { id: 'prod-56', name: '切り干し大根', price: 250, costPrice: 115, productionQuantity: 50, productCode: '000056', category: '冷惣菜', imageUrl: getImage('daikon').imageUrl, imageHint: getImage('daikon').imageHint },
  { id: 'prod-57', name: '卯の花', price: 290, costPrice: 135, productionQuantity: 50, productCode: '000057', category: '冷惣菜', imageUrl: getImage('unohana').imageUrl, imageHint: getImage('unohana').imageHint },
  { id: 'prod-58', name: 'なすの揚げ浸し', price: 320, costPrice: 150, productionQuantity: 50, productCode: '000058', category: '冷惣菜', imageUrl: getImage('fried-eggplant').imageUrl, imageHint: getImage('fried-eggplant').imageHint },
  { id: 'prod-59', name: 'きゅうりとわかめの酢の物', price: 240, costPrice: 110, productionQuantity: 50, productCode: '000059', category: '冷惣菜', imageUrl: getImage('sunomono').imageUrl, imageHint: getImage('sunomono').imageHint },
  { id: 'prod-60', name: 'もずく酢', price: 220, costPrice: 100, productionQuantity: 50, productCode: '000060', category: '冷惣菜', imageUrl: getImage('mozuku').imageUrl, imageHint: getImage('mozuku').imageHint },
  { id: 'prod-61', name: 'ピリ辛きゅうり', price: 200, costPrice: 90, productionQuantity: 50, productCode: '000061', category: '冷惣菜', imageUrl: getImage('spicy-cucumber').imageUrl, imageHint: getImage('spicy-cucumber').imageHint },
  { id: 'prod-62', name: '冷奴', price: 180, costPrice: 80, productionQuantity: 50, productCode: '000062', category: '冷惣菜', imageUrl: getImage('cold-tofu').imageUrl, imageHint: getImage('cold-tofu').imageHint },

  // 軽食 (10)
  { id: 'prod-9', name: 'おにぎり (鮭)', price: 180, costPrice: 70, productionQuantity: 50, productCode: '000009', category: '軽食', imageUrl: getImage('onigiri-salmon').imageUrl, imageHint: getImage('onigiri-salmon').imageHint },
  { id: 'prod-10', name: 'おにぎり (梅)', price: 160, costPrice: 60, productionQuantity: 50, productCode: '000010', category: '軽食', imageUrl: getImage('onigiri-ume').imageUrl, imageHint: getImage('onigiri-ume').imageHint },
  { id: 'prod-63', name: 'おにぎり (ツナマヨ)', price: 170, costPrice: 65, productionQuantity: 50, productCode: '000063', category: '軽食', imageUrl: getImage('tuna-onigiri').imageUrl, imageHint: getImage('tuna-onigiri').imageHint },
  { id: 'prod-64', name: 'サンドイッチ（ミックス）', price: 420, costPrice: 200, productionQuantity: 50, productCode: '000064', category: '軽食', imageUrl: getImage('sandwich-mix').imageUrl, imageHint: getImage('sandwich-mix').imageHint },
  { id: 'prod-65', name: 'サンドイッチ（たまご）', price: 350, costPrice: 160, productionQuantity: 50, productCode: '000065', category: '軽食', imageUrl: getImage('egg-sandwich').imageUrl, imageHint: getImage('egg-sandwich').imageHint },
  { id: 'prod-66', name: '焼きそばパン', price: 280, costPrice: 130, productionQuantity: 50, productCode: '000066', category: '軽食', imageUrl: getImage('yakisoba-pan').imageUrl, imageHint: getImage('yakisoba-pan').imageHint },
  { id: 'prod-67', name: 'コロッケパン', price: 250, costPrice: 120, productionQuantity: 50, productCode: '000067', category: '軽食', imageUrl: getImage('croquette-pan').imageUrl, imageHint: getImage('croquette-pan').imageHint },
  { id: 'prod-68', name: 'いなり寿司（3個）', price: 300, costPrice: 140, productionQuantity: 50, productCode: '000068', category: '軽食', imageUrl: getImage('inari-sushi').imageUrl, imageHint: getImage('inari-sushi').imageHint },
  { id: 'prod-69', name: 'フランクフルト', price: 200, costPrice: 90, productionQuantity: 50, productCode: '000069', category: '軽食', imageUrl: getImage('frankfurter').imageUrl, imageHint: getImage('frankfurter').imageHint },
  { id: 'prod-70', name: 'アメリカンドッグ', price: 220, costPrice: 100, productionQuantity: 50, productCode: '000070', category: '軽食', imageUrl: getImage('corn-dog').imageUrl, imageHint: getImage('corn-dog').imageHint },

  // 丼 (10)
  { id: 'prod-71', name: 'カツ丼', price: 780, costPrice: 390, productionQuantity: 50, productCode: '000071', category: '丼', imageUrl: getImage('katsudon').imageUrl, imageHint: getImage('katsudon').imageHint },
  { id: 'prod-72', name: '親子丼', price: 680, costPrice: 340, productionQuantity: 50, productCode: '000072', category: '丼', imageUrl: getImage('oyakodon').imageUrl, imageHint: getImage('oyakodon').imageHint },
  { id: 'prod-73', name: '牛丼', price: 650, costPrice: 320, productionQuantity: 50, productCode: '000073', category: '丼', imageUrl: getImage('gyudon').imageUrl, imageHint: getImage('gyudon').imageHint },
  { id: 'prod-74', name: '天丼', price: 850, costPrice: 420, productionQuantity: 50, productCode: '000074', category: '丼', imageUrl: getImage('tendon').imageUrl, imageHint: getImage('tendon').imageHint },
  { id: 'prod-75', name: '中華丼', price: 750, costPrice: 370, productionQuantity: 50, productCode: '000075', category: '丼', imageUrl: getImage('chukadon').imageUrl, imageHint: getImage('chukadon').imageHint },
  { id: 'prod-76', name: '海鮮丼', price: 980, costPrice: 500, productionQuantity: 50, productCode: '000076', category: '丼', imageUrl: getImage('kaisendon').imageUrl, imageHint: getImage('kaisendon').imageHint },
  { id: 'prod-77', name: 'ロコモコ丼', price: 820, costPrice: 410, productionQuantity: 50, productCode: '000077', category: '丼', imageUrl: getImage('locomoco').imageUrl, imageHint: getImage('locomoco').imageHint },
  { id: 'prod-78', name: 'ビビンバ丼', price: 790, costPrice: 390, productionQuantity: 50, productCode: '000078', category: '丼', imageUrl: getImage('bibimbap').imageUrl, imageHint: getImage('bibimbap').imageHint },
  { id: 'prod-79', name: '豚キムチ丼', price: 720, costPrice: 360, productionQuantity: 50, productCode: '000079', category: '丼', imageUrl: getImage('pork-kimchi').imageUrl, imageHint: getImage('pork-kimchi').imageHint },
  { id: 'prod-80', name: 'ソースカツ丼', price: 760, costPrice: 380, productionQuantity: 50, productCode: '000080', category: '丼', imageUrl: getImage('sauce-katsudon').imageUrl, imageHint: getImage('sauce-katsudon').imageHint },

  // おこわ (10)
  { id: 'prod-81', name: '山菜おこわ', price: 450, costPrice: 200, productionQuantity: 50, productCode: '000081', category: 'おこわ', imageUrl: getImage('sansai-okowa').imageUrl, imageHint: getImage('sansai-okowa').imageHint },
  { id: 'prod-82', name: '栗おこわ', price: 520, costPrice: 240, productionQuantity: 50, productCode: '000082', category: 'おこわ', imageUrl: getImage('chestnut-okowa').imageUrl, imageHint: getImage('chestnut-okowa').imageHint },
  { id: 'prod-83', name: '赤飯', price: 400, costPrice: 180, productionQuantity: 50, productCode: '000083', category: 'おこわ', imageUrl: getImage('sekihan').imageUrl, imageHint: getImage('sekihan').imageHint },
  { id: 'prod-84', name: '五目おこわ', price: 480, costPrice: 220, productionQuantity: 50, productCode: '000084', category: 'おこわ', imageUrl: getImage('gomoku-okowa').imageUrl, imageHint: getImage('gomoku-okowa').imageHint },
  { id: 'prod-85', name: '鶏おこわ', price: 490, costPrice: 230, productionQuantity: 50, productCode: '000085', category: 'おこわ', imageUrl: getImage('chicken-okowa').imageUrl, imageHint: getImage('chicken-okowa').imageHint },
  { id: 'prod-86', name: 'うなぎおこわ', price: 980, costPrice: 480, productionQuantity: 50, productCode: '000086', category: 'おこわ', imageUrl: getImage('eel-okowa').imageUrl, imageHint: getImage('eel-okowa').imageHint },
  { id: 'prod-87', name: 'きのこおこわ', price: 460, costPrice: 210, productionQuantity: 50, productCode: '000087', category: 'おこわ', imageUrl: getImage('mushroom-okowa').imageUrl, imageHint: getImage('mushroom-okowa').imageHint },
  { id: 'prod-88', name: 'たけのこおこわ', price: 500, costPrice: 235, productionQuantity: 50, productCode: '000088', category: 'おこわ', imageUrl: getImage('bamboo-okowa').imageUrl, imageHint: getImage('bamboo-okowa').imageHint },
  { id: 'prod-89', name: '豆おこわ', price: 430, costPrice: 190, productionQuantity: 50, productCode: '000089', category: 'おこわ', imageUrl: getImage('bean-okowa').imageUrl, imageHint: getImage('bean-okowa').imageHint },
  { id: 'prod-90', name: '中華おこわ', price: 550, costPrice: 260, productionQuantity: 50, productCode: '000090', category: 'おこわ', imageUrl: getImage('chinese-okowa').imageUrl, imageHint: getImage('chinese-okowa').imageHint },
];

export const transactions: Transaction[] = [];


