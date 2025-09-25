
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
  { id: 'prod-11', name: 'カニクリームコロッケ', price: 250, costPrice: 120, productionQuantity: 50, productCode: '000011', category: '揚げ物', imageUrl: `https://picsum.photos/seed/crab-croquette/400/400`, imageHint: 'crab croquette' },
  { id: 'prod-12', name: 'アジフライ', price: 190, costPrice: 90, productionQuantity: 50, productCode: '000012', category: '揚げ物', imageUrl: `https://picsum.photos/seed/fried-fish/400/400`, imageHint: 'fried fish' },
  { id: 'prod-13', name: 'イカフライ', price: 160, costPrice: 75, productionQuantity: 50, productCode: '000013', category: '揚げ物', imageUrl: `https://picsum.photos/seed/fried-squid/400/400`, imageHint: 'fried squid' },
  { id: 'prod-14', name: 'チーズチキンカツ', price: 320, costPrice: 150, productionQuantity: 50, productCode: '000014', category: '揚げ物', imageUrl: `https://picsum.photos/seed/cheese-cutlet/400/400`, imageHint: 'cheese cutlet' },
  { id: 'prod-15', name: 'エビフライ', price: 280, costPrice: 130, productionQuantity: 50, productCode: '000015', category: '揚げ物', imageUrl: `https://picsum.photos/seed/fried-shrimp/400/400`, imageHint: 'fried shrimp' },
  { id: 'prod-16', name: '串カツ（豚）', price: 150, costPrice: 70, productionQuantity: 50, productCode: '000016', category: '揚げ物', imageUrl: `https://picsum.photos/seed/pork-skewer/400/400`, imageHint: 'pork skewer' },
  { id: 'prod-17', name: 'ハムカツ', price: 130, costPrice: 60, productionQuantity: 50, productCode: '000017', category: '揚げ物', imageUrl: `https://picsum.photos/seed/ham-cutlet/400/400`, imageHint: 'ham cutlet' },
  { id: 'prod-18', name: '野菜かき揚げ', price: 200, costPrice: 95, productionQuantity: 50, productCode: '000018', category: '揚げ物', imageUrl: `https://picsum.photos/seed/veg-fritter/400/400`, imageHint: 'veg fritter' },

  // 唐揚げ (10)
  { id: 'prod-3', name: 'ジューシー唐揚げ (100g)', price: 250, costPrice: 120, productionQuantity: 50, productCode: '000002', category: '唐揚げ', imageUrl: getImage('karaage').imageUrl, imageHint: getImage('karaage').imageHint },
  { id: 'prod-19', name: 'ヤンニョムチキン (100g)', price: 300, costPrice: 140, productionQuantity: 50, productCode: '000019', category: '唐揚げ', imageUrl: `https://picsum.photos/seed/korean-chicken/400/400`, imageHint: 'korean chicken' },
  { id: 'prod-20', name: '油淋鶏（ユーリンチー）', price: 580, costPrice: 280, productionQuantity: 50, productCode: '000020', category: '唐揚げ', imageUrl: `https://picsum.photos/seed/yurinchi/400/400`, imageHint: 'chinese chicken' },
  { id: 'prod-21', name: 'チキン南蛮', price: 620, costPrice: 300, productionQuantity: 50, productCode: '000021', category: '唐揚げ', imageUrl: `https://picsum.photos/seed/chicken-nanban/400/400`, imageHint: 'nanban chicken' },
  { id: 'prod-22', name: '手羽先唐揚げ（5本）', price: 480, costPrice: 220, productionQuantity: 50, productCode: '000022', category: '唐揚げ', imageUrl: `https://picsum.photos/seed/chicken-wings/400/400`, imageHint: 'chicken wings' },
  { id: 'prod-23', name: '竜田揚げ (100g)', price: 260, costPrice: 125, productionQuantity: 50, productCode: '000023', category: '唐揚げ', imageUrl: `https://picsum.photos/seed/tatsutaage/400/400`, imageHint: 'tatsutaage chicken' },
  { id: 'prod-24', name: '軟骨唐揚げ', price: 350, costPrice: 160, productionQuantity: 50, productCode: '000024', category: '唐揚げ', imageUrl: `https://picsum.photos/seed/cartilage-karaage/400/400`, imageHint: 'cartilage karaage' },
  { id: 'prod-25', name: '砂肝の唐揚げ', price: 320, costPrice: 150, productionQuantity: 50, productCode: '000025', category: '唐揚げ', imageUrl: `https://picsum.photos/seed/gizzard-karaage/400/400`, imageHint: 'gizzard karaage' },
  { id: 'prod-26', name: 'ハーブソルト唐揚げ (100g)', price: 280, costPrice: 135, productionQuantity: 50, productCode: '000026', category: '唐揚げ', imageUrl: `https://picsum.photos/seed/herb-chicken/400/400`, imageHint: 'herb chicken' },
  { id: 'prod-27', name: '塩麹唐揚げ (100g)', price: 290, costPrice: 140, productionQuantity: 50, productCode: '000027', category: '唐揚げ', imageUrl: `https://picsum.photos/seed/shiokoji-chicken/400/400`, imageHint: 'shiokoji chicken' },

  // サラダ (10)
  { id: 'prod-4', name: '彩り野菜のポテトサラダ', price: 320, costPrice: 150, productionQuantity: 50, productCode: '000004', category: 'サラダ', imageUrl: getImage('potato-salad').imageUrl, imageHint: getImage('potato-salad').imageHint },
  { id: 'prod-28', name: 'シーザーサラダ', price: 450, costPrice: 210, productionQuantity: 50, productCode: '000028', category: 'サラダ', imageUrl: `https://picsum.photos/seed/caesar-salad/400/400`, imageHint: 'caesar salad' },
  { id: 'prod-29', name: '豆腐とわかめの和風サラダ', price: 380, costPrice: 180, productionQuantity: 50, productCode: '000029', category: 'サラダ', imageUrl: `https://picsum.photos/seed/tofu-salad/400/400`, imageHint: 'tofu salad' },
  { id: 'prod-30', name: 'マカロニサラダ', price: 280, costPrice: 130, productionQuantity: 50, productCode: '000030', category: 'サラダ', imageUrl: `https://picsum.photos/seed/macaroni-salad/400/400`, imageHint: 'macaroni salad' },
  { id: 'prod-31', name: 'コールスロー', price: 250, costPrice: 115, productionQuantity: 50, productCode: '000031', category: 'サラダ', imageUrl: `https://picsum.photos/seed/coleslaw/400/400`, imageHint: 'coleslaw' },
  { id: 'prod-32', name: '春雨サラダ', price: 300, costPrice: 140, productionQuantity: 50, productCode: '000032', category: 'サラダ', imageUrl: `https://picsum.photos/seed/noodle-salad/400/400`, imageHint: 'noodle salad' },
  { id: 'prod-33', name: '海老とアボカドのサラダ', price: 520, costPrice: 250, productionQuantity: 50, productCode: '000033', category: 'サラダ', imageUrl: `https://picsum.photos/seed/shrimp-avocado/400/400`, imageHint: 'shrimp avocado' },
  { id: 'prod-34', name: 'ごぼうサラダ', price: 290, costPrice: 135, productionQuantity: 50, productCode: '000034', category: 'サラダ', imageUrl: `https://picsum.photos/seed/burdock-salad/400/400`, imageHint: 'burdock salad' },
  { id: 'prod-35', name: '生ハムのサラダ', price: 480, costPrice: 230, productionQuantity: 50, productCode: '000035', category: 'サラダ', imageUrl: `https://picsum.photos/seed/prosciutto-salad/400/400`, imageHint: 'prosciutto salad' },
  { id: 'prod-36', name: 'かぼちゃサラダ', price: 310, costPrice: 145, productionQuantity: 50, productCode: '000036', category: 'サラダ', imageUrl: `https://picsum.photos/seed/pumpkin-salad/400/400`, imageHint: 'pumpkin salad' },

  // 弁当 (10)
  { id: 'prod-5', name: '日替わり幕の内弁当', price: 850, costPrice: 450, productionQuantity: 50, productCode: '000005', category: '弁当', imageUrl: getImage('bento-box').imageUrl, imageHint: getImage('bento-box').imageHint },
  { id: 'prod-6', name: 'のり弁当', price: 550, costPrice: 280, productionQuantity: 50, productCode: '000006', category: '弁当', imageUrl: getImage('nori-bento').imageUrl, imageHint: getImage('nori-bento').imageHint },
  { id: 'prod-37', name: '唐揚げ弁当', price: 680, costPrice: 350, productionQuantity: 50, productCode: '000037', category: '弁当', imageUrl: `https://picsum.photos/seed/karaage-bento/400/400`, imageHint: 'karaage bento' },
  { id: 'prod-38', name: '生姜焼き弁当', price: 720, costPrice: 380, productionQuantity: 50, productCode: '000038', category: '弁当', imageUrl: `https://picsum.photos/seed/ginger-pork/400/400`, imageHint: 'ginger pork' },
  { id: 'prod-39', name: 'ハンバーグ弁当', price: 780, costPrice: 400, productionQuantity: 50, productCode: '000039', category: '弁当', imageUrl: `https://picsum.photos/seed/hamburg-bento/400/400`, imageHint: 'hamburg bento' },
  { id: 'prod-40', name: '鮭弁当', price: 650, costPrice: 330, productionQuantity: 50, productCode: '000040', category: '弁当', imageUrl: `https://picsum.photos/seed/salmon-bento/400/400`, imageHint: 'salmon bento' },
  { id: 'prod-41', name: 'とんかつ弁当', price: 820, costPrice: 420, productionQuantity: 50, productCode: '000041', category: '弁当', imageUrl: `https://picsum.photos/seed/tonkatsu-bento/400/400`, imageHint: 'tonkatsu bento' },
  { id: 'prod-42', name: '野菜炒め弁当', price: 600, costPrice: 300, productionQuantity: 50, productCode: '000042', category: '弁当', imageUrl: `https://picsum.photos/seed/stir-fry/400/400`, imageHint: 'stir fry' },
  { id: 'prod-43', name: '中華弁当', price: 880, costPrice: 460, productionQuantity: 50, productCode: '000043', category: '弁当', imageUrl: `https://picsum.photos/seed/chinese-bento/400/400`, imageHint: 'chinese bento' },
  { id: 'prod-44', name: 'お子様弁当', price: 500, costPrice: 250, productionQuantity: 50, productCode: '000044', category: '弁当', imageUrl: `https://picsum.photos/seed/kids-bento/400/400`, imageHint: 'kids bento' },

  // 温惣菜 (10)
  { id: 'prod-7', name: '特製だし巻き卵', price: 480, costPrice: 200, productionQuantity: 50, productCode: '000007', category: '温惣菜', imageUrl: getImage('dashimaki-tamago').imageUrl, imageHint: getImage('dashimaki-tamago').imageHint },
  { id: 'prod-45', name: '肉じゃが', price: 420, costPrice: 180, productionQuantity: 50, productCode: '000045', category: '温惣菜', imageUrl: `https://picsum.photos/seed/niku-jaga/400/400`, imageHint: 'niku jaga' },
  { id: 'prod-46', name: '筑前煮', price: 450, costPrice: 200, productionQuantity: 50, productCode: '000046', category: '温惣菜', imageUrl: `https://picsum.photos/seed/chikuzenni/400/400`, imageHint: 'chikuzenni' },
  { id: 'prod-47', name: '豚の角煮', price: 680, costPrice: 320, productionQuantity: 50, productCode: '000047', category: '温惣菜', imageUrl: `https://picsum.photos/seed/pork-belly/400/400`, imageHint: 'pork belly' },
  { id: 'prod-48', name: '麻婆豆腐', price: 550, costPrice: 250, productionQuantity: 50, productCode: '000048', category: '温惣菜', imageUrl: `https://picsum.photos/seed/mapo-tofu/400/400`, imageHint: 'mapo tofu' },
  { id: 'prod-49', name: 'カレイの煮付け', price: 580, costPrice: 280, productionQuantity: 50, productCode: '000049', category: '温惣菜', imageUrl: `https://picsum.photos/seed/simmered-fish/400/400`, imageHint: 'simmered fish' },
  { id: 'prod-50', name: 'ロールキャベツ', price: 380, costPrice: 170, productionQuantity: 50, productCode: '000050', category: '温惣菜', imageUrl: `https://picsum.photos/seed/cabbage-rolls/400/400`, imageHint: 'cabbage rolls' },
  { id: 'prod-51', name: 'おでん（5種盛り）', price: 600, costPrice: 280, productionQuantity: 50, productCode: '000051', category: '温惣菜', imageUrl: `https://picsum.photos/seed/oden/400/400`, imageHint: 'oden' },
  { id: 'prod-52', name: '鶏肉のトマト煮込み', price: 620, costPrice: 300, productionQuantity: 50, productCode: '000052', category: '温惣菜', imageUrl: `https://picsum.photos/seed/chicken-stew/400/400`, imageHint: 'chicken stew' },
  { id: 'prod-53', name: '牛すじ煮込み', price: 590, costPrice: 290, productionQuantity: 50, productCode: '000053', category: '温惣菜', imageUrl: `https://picsum.photos/seed/beef-tendon/400/400`, imageHint: 'beef tendon' },
  
  // 冷惣菜 (10)
  { id: 'prod-8', name: 'ほうれん草の胡麻和え', price: 280, costPrice: 130, productionQuantity: 50, productCode: '000008', category: '冷惣菜', imageUrl: getImage('gomaae').imageUrl, imageHint: getImage('gomaae').imageHint },
  { id: 'prod-54', name: 'きんぴらごぼう', price: 260, costPrice: 120, productionQuantity: 50, productCode: '000054', category: '冷惣菜', imageUrl: `https://picsum.photos/seed/kinpira/400/400`, imageHint: 'kinpira' },
  { id: 'prod-55', name: 'ひじきの煮物', price: 270, costPrice: 125, productionQuantity: 50, productCode: '000055', category: '冷惣菜', imageUrl: `https://picsum.photos/seed/hijiki/400/400`, imageHint: 'hijiki' },
  { id: 'prod-56', name: '切り干し大根', price: 250, costPrice: 115, productionQuantity: 50, productCode: '000056', category: '冷惣菜', imageUrl: `https://picsum.photos/seed/daikon/400/400`, imageHint: 'dried daikon' },
  { id: 'prod-57', name: '卯の花', price: 290, costPrice: 135, productionQuantity: 50, productCode: '000057', category: '冷惣菜', imageUrl: `https://picsum.photos/seed/unohana/400/400`, imageHint: 'unohana' },
  { id: 'prod-58', name: 'なすの揚げ浸し', price: 320, costPrice: 150, productionQuantity: 50, productCode: '000058', category: '冷惣菜', imageUrl: `https://picsum.photos/seed/fried-eggplant/400/400`, imageHint: 'fried eggplant' },
  { id: 'prod-59', name: 'きゅうりとわかめの酢の物', price: 240, costPrice: 110, productionQuantity: 50, productCode: '000059', category: '冷惣菜', imageUrl: `https://picsum.photos/seed/sunomono/400/400`, imageHint: 'sunomono' },
  { id: 'prod-60', name: 'もずく酢', price: 220, costPrice: 100, productionQuantity: 50, productCode: '000060', category: '冷惣菜', imageUrl: `https://picsum.photos/seed/mozuku/400/400`, imageHint: 'mozuku' },
  { id: 'prod-61', name: 'ピリ辛きゅうり', price: 200, costPrice: 90, productionQuantity: 50, productCode: '000061', category: '冷惣菜', imageUrl: `https://picsum.photos/seed/spicy-cucumber/400/400`, imageHint: 'spicy cucumber' },
  { id: 'prod-62', name: '冷奴', price: 180, costPrice: 80, productionQuantity: 50, productCode: '000062', category: '冷惣菜', imageUrl: `https://picsum.photos/seed/cold-tofu/400/400`, imageHint: 'cold tofu' },

  // 軽食 (10)
  { id: 'prod-9', name: 'おにぎり (鮭)', price: 180, costPrice: 70, productionQuantity: 50, productCode: '000009', category: '軽食', imageUrl: getImage('onigiri-salmon').imageUrl, imageHint: getImage('onigiri-salmon').imageHint },
  { id: 'prod-10', name: 'おにぎり (梅)', price: 160, costPrice: 60, productionQuantity: 50, productCode: '000010', category: '軽食', imageUrl: getImage('onigiri-ume').imageUrl, imageHint: getImage('onigiri-ume').imageHint },
  { id: 'prod-63', name: 'おにぎり (ツナマヨ)', price: 170, costPrice: 65, productionQuantity: 50, productCode: '000063', category: '軽食', imageUrl: `https://picsum.photos/seed/tuna-onigiri/400/400`, imageHint: 'tuna onigiri' },
  { id: 'prod-64', name: 'サンドイッチ（ミックス）', price: 420, costPrice: 200, productionQuantity: 50, productCode: '000064', category: '軽食', imageUrl: `https://picsum.photos/seed/sandwich-mix/400/400`, imageHint: 'sandwich mix' },
  { id: 'prod-65', name: 'サンドイッチ（たまご）', price: 350, costPrice: 160, productionQuantity: 50, productCode: '000065', category: '軽食', imageUrl: `https://picsum.photos/seed/egg-sandwich/400/400`, imageHint: 'egg sandwich' },
  { id: 'prod-66', name: '焼きそばパン', price: 280, costPrice: 130, productionQuantity: 50, productCode: '000066', category: '軽食', imageUrl: `https://picsum.photos/seed/yakisoba-pan/400/400`, imageHint: 'yakisoba pan' },
  { id: 'prod-67', name: 'コロッケパン', price: 250, costPrice: 120, productionQuantity: 50, productCode: '000067', category: '軽食', imageUrl: `https://picsum.photos/seed/croquette-pan/400/400`, imageHint: 'croquette pan' },
  { id: 'prod-68', name: 'いなり寿司（3個）', price: 300, costPrice: 140, productionQuantity: 50, productCode: '000068', category: '軽食', imageUrl: `https://picsum.photos/seed/inari-sushi/400/400`, imageHint: 'inari sushi' },
  { id: 'prod-69', name: 'フランクフルト', price: 200, costPrice: 90, productionQuantity: 50, productCode: '000069', category: '軽食', imageUrl: `https://picsum.photos/seed/frankfurter/400/400`, imageHint: 'frankfurter' },
  { id: 'prod-70', name: 'アメリカンドッグ', price: 220, costPrice: 100, productionQuantity: 50, productCode: '000070', category: '軽食', imageUrl: `https://picsum.photos/seed/corn-dog/400/400`, imageHint: 'corn dog' },

  // 丼 (10)
  { id: 'prod-71', name: 'カツ丼', price: 780, costPrice: 390, productionQuantity: 50, productCode: '000071', category: '丼', imageUrl: `https://picsum.photos/seed/katsudon/400/400`, imageHint: 'katsudon' },
  { id: 'prod-72', name: '親子丼', price: 680, costPrice: 340, productionQuantity: 50, productCode: '000072', category: '丼', imageUrl: `https://picsum.photos/seed/oyakodon/400/400`, imageHint: 'oyakodon' },
  { id: 'prod-73', name: '牛丼', price: 650, costPrice: 320, productionQuantity: 50, productCode: '000073', category: '丼', imageUrl: `https://picsum.photos/seed/gyudon/400/400`, imageHint: 'gyudon' },
  { id: 'prod-74', name: '天丼', price: 850, costPrice: 420, productionQuantity: 50, productCode: '000074', category: '丼', imageUrl: `https://picsum.photos/seed/tendon/400/400`, imageHint: 'tendon' },
  { id: 'prod-75', name: '中華丼', price: 750, costPrice: 370, productionQuantity: 50, productCode: '000075', category: '丼', imageUrl: `https://picsum.photos/seed/chukadon/400/400`, imageHint: 'chukadon' },
  { id: 'prod-76', name: '海鮮丼', price: 980, costPrice: 500, productionQuantity: 50, productCode: '000076', category: '丼', imageUrl: `https://picsum.photos/seed/kaisendon/400/400`, imageHint: 'kaisendon' },
  { id: 'prod-77', name: 'ロコモコ丼', price: 820, costPrice: 410, productionQuantity: 50, productCode: '000077', category: '丼', imageUrl: `https://picsum.photos/seed/locomoco/400/400`, imageHint: 'locomoco' },
  { id: 'prod-78', name: 'ビビンバ丼', price: 790, costPrice: 390, productionQuantity: 50, productCode: '000078', category: '丼', imageUrl: `https://picsum.photos/seed/bibimbap/400/400`, imageHint: 'bibimbap' },
  { id: 'prod-79', name: '豚キムチ丼', price: 720, costPrice: 360, productionQuantity: 50, productCode: '000079', category: '丼', imageUrl: `https://picsum.photos/seed/pork-kimchi-don/400/400`, imageHint: 'pork kimchi' },
  { id: 'prod-80', name: 'ソースカツ丼', price: 760, costPrice: 380, productionQuantity: 50, productCode: '000080', category: '丼', imageUrl: `https://picsum.photos/seed/sauce-katsudon/400/400`, imageHint: 'sauce katsudon' },

  // おこわ (10)
  { id: 'prod-81', name: '山菜おこわ', price: 450, costPrice: 200, productionQuantity: 50, productCode: '000081', category: 'おこわ', imageUrl: `https://picsum.photos/seed/sansai-okowa/400/400`, imageHint: 'sansai okowa' },
  { id: 'prod-82', name: '栗おこわ', price: 520, costPrice: 240, productionQuantity: 50, productCode: '000082', category: 'おこわ', imageUrl: `https://picsum.photos/seed/chestnut-okowa/400/400`, imageHint: 'chestnut okowa' },
  { id: 'prod-83', name: '赤飯', price: 400, costPrice: 180, productionQuantity: 50, productCode: '000083', category: 'おこわ', imageUrl: `https://picsum.photos/seed/sekihan/400/400`, imageHint: 'sekihan' },
  { id: 'prod-84', name: '五目おこわ', price: 480, costPrice: 220, productionQuantity: 50, productCode: '000084', category: 'おこわ', imageUrl: `https://picsum.photos/seed/gomoku-okowa/400/400`, imageHint: 'gomoku okowa' },
  { id: 'prod-85', name: '鶏おこわ', price: 490, costPrice: 230, productionQuantity: 50, productCode: '000085', category: 'おこわ', imageUrl: `https://picsum.photos/seed/chicken-okowa/400/400`, imageHint: 'chicken okowa' },
  { id: 'prod-86', name: 'うなぎおこわ', price: 980, costPrice: 480, productionQuantity: 50, productCode: '000086', category: 'おこわ', imageUrl: `https://picsum.photos/seed/eel-okowa/400/400`, imageHint: 'eel okowa' },
  { id: 'prod-87', name: 'きのこおこわ', price: 460, costPrice: 210, productionQuantity: 50, productCode: '000087', category: 'おこわ', imageUrl: `https://picsum.photos/seed/mushroom-okowa/400/400`, imageHint: 'mushroom okowa' },
  { id: 'prod-88', name: 'たけのこおこわ', price: 500, costPrice: 235, productionQuantity: 50, productCode: '000088', category: 'おこわ', imageUrl: `https://picsum.photos/seed/bamboo-okowa/400/400`, imageHint: 'bamboo okowa' },
  { id: 'prod-89', name: '豆おこわ', price: 430, costPrice: 190, productionQuantity: 50, productCode: '000089', category: 'おこわ', imageUrl: `https://picsum.photos/seed/bean-okowa/400/400`, imageHint: 'bean okowa' },
  { id: 'prod-90', name: '中華おこわ', price: 550, costPrice: 260, productionQuantity: 50, productCode: '000090', category: 'おこわ', imageUrl: `https://picsum.photos/seed/chinese-okowa/400/400`, imageHint: 'chinese okowa' },
];

export const transactions: Transaction[] = [];
