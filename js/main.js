/* ===========================
   PULSEPOP OFFICIAL WEBSITE
   Main JavaScript v4
=========================== */

// ===== STREAMER DATA (29 featured) =====
const streamers = [
  {
    handle: 'sj231009', name: '馬妹', fullName: '馬妹🐴',
    url: 'https://www.tiktok.com/@sj231009',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/57e7e7ef8a6c48ad005d892638f36bb4~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=9640&refresh_token=dbc66509&x-expires=1778904000&x-signature=sCmGzxFnj5%2BXd1knwiwceZlKDiE%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🐴'
  },
  {
    handle: 'zunwang5858518', name: '沐光', fullName: '沐光🍹',
    url: 'https://www.tiktok.com/@zunwang5858518',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-maliva-avt-0068/a53fbaf46125a08ce525e27a97e1b2a2~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=9640&refresh_token=b150334c&x-expires=1778904000&x-signature=%2BfyCdUqmhDuuSVZ3km3AWF9utQU%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🍹'
  },
  {
    handle: 'lin_959595', name: '優Yoyo', fullName: '優Yoyo🪀',
    url: 'https://www.tiktok.com/@lin_959595',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/a41550067abc0e02a2445ad713c58a9f~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=9640&refresh_token=ee8a1896&x-expires=1778904000&x-signature=WtFuKB1f434dXdYRPpH32uGzDIs%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🪀'
  },
  {
    handle: 'sherrolss', name: '知音姊姊', fullName: '知音姊姊',
    url: 'https://www.tiktok.com/@sherrolss',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/ae4ae713574eb5d486cfbb3d1c78d3cc~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=9640&refresh_token=d9781ca3&x-expires=1778904000&x-signature=I%2BsAopXcUq1t1Pd0ZZNpFTdASwM%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🎵'
  },
  {
    handle: 'mai916537', name: '甜桃', fullName: '甜桃🍑',
    url: 'https://www.tiktok.com/@mai916537',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/48cd78b58c79109ad6e920f8ebdf7bb2~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=9640&refresh_token=39be843d&x-expires=1778904000&x-signature=N2ZQSH507NqRUJhfFjRnThYuJQY%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🍑'
  },
  {
    handle: 'pp888a', name: '瑜媽', fullName: '瑜媽🐯',
    url: 'https://www.tiktok.com/@pp888a',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/45e8c05cbab68b96206deb2a8ed919ca~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=9640&refresh_token=2bfbcf82&x-expires=1778904000&x-signature=nN3NoyYAt2xxu7O27lxShhCqgr4%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🐯'
  },
  {
    handle: 'xnln1538', name: '亮亮', fullName: '亮亮❣️',
    url: 'https://www.tiktok.com/@xnln1538',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/51b3de1d3b76d2a6a1ad461b3e238ee6~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=9640&refresh_token=8c68a5e6&x-expires=1778904000&x-signature=jm51BXr5F8%2B%2BYgW1u4nkhYEeIpA%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '❣️'
  },
  {
    handle: 'duolyu1225', name: '多多綠', fullName: '多多綠🌙',
    url: 'https://www.tiktok.com/@duolyu1225',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/2bd489846b62f98eed8b4984229aba1a~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=9640&refresh_token=7707860a&x-expires=1778904000&x-signature=gaGT5pGPhmbPG49PIPxgrmtItjU%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🌙'
  },
  {
    handle: 'renatz0503', name: '芮娜', fullName: '芮娜🧶',
    url: 'https://www.tiktok.com/@renatz0503',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/3eccb6293e5fc8515c2f2023ee502ab6~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=9640&refresh_token=01f6e05f&x-expires=1778904000&x-signature=3hggGfQtE8lbShy8L80NJLc%2BbAw%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🧶'
  },
  {
    handle: 'nini_1003_hyn', name: 'NiNi', fullName: 'NiNi🦦',
    url: 'https://www.tiktok.com/@nini_1003_hyn',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/4af7fbc3ca065c04953e08579bba5488~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=9640&refresh_token=0007ca8f&x-expires=1778904000&x-signature=RQPohDlNL%2FOZU4SrjnJIwRPOtXw%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🦦'
  },
  {
    handle: 'taco_ya124', name: '叩叩Taco', fullName: '叩叩Taco🌱',
    url: 'https://www.tiktok.com/@taco_ya124',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/852caef70d15af375bf1b95a93e1e9c5~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=9640&refresh_token=a278f27b&x-expires=1778904000&x-signature=d10m3UbllVEjO035wWOO9x0qia0%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🌱'
  },
  {
    handle: 'c_mi_0908', name: '米姥思', fullName: '米姥思🪅',
    url: 'https://www.tiktok.com/@c_mi_0908',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/a2b319c0aadf33cd90d12e6289c8f1c2~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=9640&refresh_token=51951693&x-expires=1778904000&x-signature=T4VOXT3aZ8uHpKSEqyG8Mje85jY%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🪅'
  },
  {
    handle: 'ambercblyr3', name: '貢你妹', fullName: '貢你妹🍘',
    url: 'https://www.tiktok.com/@ambercblyr3',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/4067b46497b0afa848268977424fe901~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=9640&refresh_token=ef978584&x-expires=1778904000&x-signature=O7fTNK%2FKZ9qJUTmnCZUZMdEOs00%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🍘'
  },
  {
    handle: 'demidemi0103', name: 'ㄚ咪', fullName: '貪吃鬼ㄚ咪🥚',
    url: 'https://www.tiktok.com/@demidemi0103',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/3c8e76800be00cbf0bdedcd6ff52ed84~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=9640&refresh_token=bbe89f85&x-expires=1778904000&x-signature=e9FDJo6c77yOCLeFqItb2bnrfks%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🥚'
  },
  {
    handle: 'juiccc25', name: '優優', fullName: '優優🍒',
    url: 'https://www.tiktok.com/@juiccc25',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/610a9cecdb501bd66f8ef990a281342e~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=9640&refresh_token=12f29e86&x-expires=1778904000&x-signature=4TRhq78UHtR4fcPw%2F%2Fk5diic9YA%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🍒'
  },
  {
    handle: 'chloe13149999', name: '克蘿伊', fullName: '克蘿伊🎀',
    url: 'https://www.tiktok.com/@chloe13149999',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/dcc67005bb065ff9650c0f0ae23a501f~tplv-tiktokx-cropcenter:100:100.jpeg?dr=9640&refresh_token=6017ead6&x-expires=1778907600&x-signature=8Xd6DOXN7RvSpiHPr8o2B9gJXT0%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🎀'
  },
  {
    handle: 'sevenmonki', name: '阿娜子', fullName: 'A-NA阿娜子🐵',
    url: 'https://www.tiktok.com/@sevenmonki',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-useast2a-avt-0068-giso/2194e4d421913c5750d907e5268e22fa~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=9640&refresh_token=6f497b9a&x-expires=1778904000&x-signature=%2Faa2AKZMT3Qd2R%2B1jkiUJt5g4ws%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🐵'
  },
  {
    handle: 'sea.817', name: '黃曉海', fullName: '黃曉海🌊',
    url: 'https://www.tiktok.com/@sea.817',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/73c2680137417eebd50ec7f26004c78e~tplv-tiktokx-cropcenter:100:100.jpeg?dr=9640&refresh_token=099b82cd&x-expires=1778907600&x-signature=dPMZTMG9VhOrDq5zEsAHRhd3CIs%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🌊'
  },
  {
    handle: 'lucky_1388', name: '皮蛋', fullName: '皮蛋🍀',
    url: 'https://www.tiktok.com/@lucky_1388',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/252060d82776757f0d15942e65351e47~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=9640&refresh_token=5aef64c7&x-expires=1778904000&x-signature=Oe7G7PoW8KeyqAvBtYjly7bipgw%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🍀'
  },
  {
    handle: 'user30678fuck', name: 'Faker', fullName: 'Faker🐟',
    url: 'https://www.tiktok.com/@user30678fuck',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/c214fbcfc5aadbb5b51effe025849c15~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=9640&refresh_token=ce2a8a95&x-expires=1778904000&x-signature=iJ3exdSDurk4ECbHK9GMN%2BZJy%2Fc%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🐟'
  },
  {
    // Fixed: now has real avatar (was placeholder before)
    handle: 'fierce1222', name: '元承烈', fullName: '元承烈🎙️',
    url: 'https://www.tiktok.com/@fierce1222',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/ab1eec9d3ee25dfde12ade5a67fb5030~tplv-tiktokx-cropcenter:100:100.jpeg?dr=9640&refresh_token=0b85c3ae&x-expires=1778907600&x-signature=TN3t38y3ivabUG1ipgX2Pvdtd20%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '⚜️'
  },
  {
    handle: 'jack09_20', name: 'Jack', fullName: 'Jack💼',
    url: 'https://www.tiktok.com/@jack09_20',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/c2b630fc02952671f927982a18e367ee~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=9640&refresh_token=e9ff2f1a&x-expires=1778904000&x-signature=X5%2FIK07cdaPL9CgdndGsFCkx22Y%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '💼'
  },
  {
    handle: 'jan_11111', name: '河馬哥哥', fullName: '河馬哥哥🦛',
    url: 'https://www.tiktok.com/@jan_11111',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/5205168327d10b91eb0912f5af8d46e8~tplv-tiktokx-cropcenter:100:100.jpeg?dr=9640&refresh_token=f9002acf&x-expires=1778907600&x-signature=rq8I4%2BDpoJlk0AEsbTthpI6ywrM%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🦛'
  },
  {
    // Fixed: now has real avatar (was placeholder before)
    handle: 'm4jo6211', name: '小折', fullName: '小折💣',
    url: 'https://www.tiktok.com/@m4jo6211',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/bca387733b9d075426ad55f10f2ffec6~tplv-tiktokx-cropcenter:100:100.jpeg?dr=9640&refresh_token=b65a8804&x-expires=1778907600&x-signature=dJdnd3FK3bBG8jfM9PAAiW7suyM%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '💣'
  },
  {
    handle: 'eunice_ice_', name: '尤妮酥', fullName: '尤妮酥💫',
    url: 'https://www.tiktok.com/@eunice_ice_',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-maliva-avt-0068/77ef50ddb3a14a11b187d4929a0d7488~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=9640&refresh_token=0bb43140&x-expires=1778904000&x-signature=rTlmOzVOZ2om6OOShXb56gzG%2F8M%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '💫'
  },
  {
    handle: 'wawagiking', name: '翔a', fullName: '翔a🎈',
    url: 'https://www.tiktok.com/@wawagiking',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/e1807f6f294b61a67185e7b4270c4bf7~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=9640&refresh_token=96f1cc4d&x-expires=1778904000&x-signature=6Vp%2FDe0hYOwmV%2FrSodGRVwEND7k%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🎈'
  },
  {
    handle: '080u_u080', name: '拾貳', fullName: '拾貳🎈',
    url: 'https://www.tiktok.com/@080u_u080',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-maliva-avt-0068/6699ebd71df5f5ac55e631b9fc9fc307~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=9640&refresh_token=a2907d15&x-expires=1778904000&x-signature=2%2B5QEV1sUltWbr5yAgPE62ysWF0%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🎈'
  },
  {
    handle: 'ciaoc.tw', name: '雀兒', fullName: '雀兒👽',
    url: 'https://www.tiktok.com/@ciaoc.tw',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/285138a91d23443ce43016ba53833bc8~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=9640&refresh_token=148d663e&x-expires=1778904000&x-signature=6blccPo%2Bm5%2F%2B4Xs7ePcCXN7Ffhw%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '👽'
  },
  {
    handle: 'zhi_xuan93_0125', name: '尹流星', fullName: '尹流星🎙️',
    url: 'https://www.tiktok.com/@zhi_xuan93_0125',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/32fa063fdaac618de40159767b9fc464~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=9640&refresh_token=e59313a7&x-expires=1778904000&x-signature=CJxT%2Fvir3UfR8dvPr3%2F7uEMV4tQ%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🎙️'
  }
];

// ===== 活動專區 DATA =====

// 4月金牌主播排行榜
const goldRanking = [
  {
    rank: 1, handle: 'duolyu1225', name: '多多綠', fullName: '多多綠🌙',
    url: 'https://www.tiktok.com/@duolyu1225',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/2bd489846b62f98eed8b4984229aba1a~tplv-tiktokx-cropcenter:100:100.jpeg?dr=9640&refresh_token=05652487&x-expires=1778907600&x-signature=5gaCvQDfqZFQHpCOZCF1JTanTEs%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🌙', medal: '🥇'
  },
  {
    rank: 2, handle: 'sj231009', name: '馬妹', fullName: '馬妹🐴',
    url: 'https://www.tiktok.com/@sj231009',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/57e7e7ef8a6c48ad005d892638f36bb4~tplv-tiktokx-cropcenter:100:100.jpeg?dr=9640&refresh_token=c60456f1&x-expires=1778907600&x-signature=ZzKmcGk5dSKsax85d7Hji1jbSY4%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🐴', medal: '🥈'
  },
  {
    rank: 3, handle: 'nini_1003_hyn', name: 'NiNi', fullName: 'NiNi🦦',
    url: 'https://www.tiktok.com/@nini_1003_hyn',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/4af7fbc3ca065c04953e08579bba5488~tplv-tiktokx-cropcenter:100:100.jpeg?dr=9640&refresh_token=e9a22c82&x-expires=1778907600&x-signature=%2BhdBydhTfqyl%2Bopv7UbtwVqaAXw%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🦦', medal: '🥉'
  },
  {
    rank: 4, handle: 'renatz0503', name: '芮娜', fullName: '芮娜🧶',
    url: 'https://www.tiktok.com/@renatz0503',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/3eccb6293e5fc8515c2f2023ee502ab6~tplv-tiktokx-cropcenter:100:100.jpeg?dr=9640&refresh_token=050b50e6&x-expires=1778907600&x-signature=9H%2F3QKfl24qsHubOnndD1yAKUZM%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🧶', medal: '4️⃣'
  },
  {
    rank: 5, handle: 'taco_ya124', name: '叩叩Taco', fullName: '叩叩Taco🌱',
    url: 'https://www.tiktok.com/@taco_ya124',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/852caef70d15af375bf1b95a93e1e9c5~tplv-tiktokx-cropcenter:100:100.jpeg?dr=9640&refresh_token=6c7b84bb&x-expires=1778907600&x-signature=zkaym2PhO14xOYf71HvdPirS5Dk%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🌱', medal: '5️⃣'
  }
];

// 新進主播
const newStreamers = [
  {
    handle: 'dearpink0311', name: '娃娃', fullName: 'Love娃娃🐾',
    url: 'https://www.tiktok.com/@dearpink0311',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/0a10508a4d7af2f64698ad90314fed40~tplv-tiktokx-cropcenter:100:100.jpeg?dr=9640&refresh_token=34717b9d&x-expires=1778907600&x-signature=vCy%2FILJj2PO6h4hPHUJUUWgwKt8%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🐾'
  },
  {
    handle: 'sea.817', name: '黃曉海', fullName: '黃曉海🌊',
    url: 'https://www.tiktok.com/@sea.817',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/73c2680137417eebd50ec7f26004c78e~tplv-tiktokx-cropcenter:100:100.jpeg?dr=9640&refresh_token=099b82cd&x-expires=1778907600&x-signature=dPMZTMG9VhOrDq5zEsAHRhd3CIs%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🌊'
  },
  {
    handle: 'chloe13149999', name: '克蘿伊', fullName: '克蘿伊🎀',
    url: 'https://www.tiktok.com/@chloe13149999',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/dcc67005bb065ff9650c0f0ae23a501f~tplv-tiktokx-cropcenter:100:100.jpeg?dr=9640&refresh_token=6017ead6&x-expires=1778907600&x-signature=8Xd6DOXN7RvSpiHPr8o2B9gJXT0%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🎀'
  },
  {
    handle: 'ooooo6789ooooo', name: 'Guanting99', fullName: 'Guanting 99✨',
    url: 'https://www.tiktok.com/@ooooo6789ooooo',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/601bbc662b1cd44ab926aeb39ced7a8b~tplv-tiktokx-cropcenter:100:100.jpeg?dr=9640&refresh_token=426eb352&x-expires=1778907600&x-signature=BCW5mn6mqHuB8FvOHcZMHvqVilQ%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '✨'
  },
  {
    handle: 'jan_11111', name: '河馬哥哥', fullName: '河馬哥哥🦛',
    url: 'https://www.tiktok.com/@jan_11111',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/5205168327d10b91eb0912f5af8d46e8~tplv-tiktokx-cropcenter:100:100.jpeg?dr=9640&refresh_token=f9002acf&x-expires=1778907600&x-signature=rq8I4%2BDpoJlk0AEsbTthpI6ywrM%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🦛'
  },
  {
    handle: 'amis790608', name: '凱凱', fullName: '凱凱🌈',
    url: 'https://www.tiktok.com/@amis790608',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/711e83988c3a7035580f7ca459b8a841~tplv-tiktokx-cropcenter:100:100.jpeg?dr=9640&refresh_token=2cb31730&x-expires=1778907600&x-signature=z5%2Bfe1yKnZr2eHHhwgqCttqtUcE%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🌈'
  },
  {
    handle: 'www__shay', name: 'Shay烜', fullName: 'Shay 烜♡',
    url: 'https://www.tiktok.com/@www__shay',
    thumb: 'https://p19-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/d488c1b953194091d53edfdaa9242e28~tplv-tiktokx-cropcenter:100:100.jpeg?dr=9640&refresh_token=095f9648&x-expires=1778907600&x-signature=U8r3b6yj7oCBACZFsAgfmE%2FXoag%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '♡'
  },
  {
    handle: 'lauralan.tw', name: '藍辰語', fullName: '藍辰語🌸',
    url: 'https://www.tiktok.com/@lauralan.tw',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/9e3e0f00c1f6a5c8e03775e790fb0538~tplv-tiktokx-cropcenter:100:100.jpeg?dr=9640&refresh_token=fbda1fe8&x-expires=1778907600&x-signature=gXEl7BMjhwTfXscD2gLvYxkd4dk%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🌸'
  },
  {
    handle: 'user8542304936538', name: '柚子', fullName: '🔥柚子🐺',
    url: 'https://www.tiktok.com/@user8542304936538',
    thumb: 'https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/27eeb7dcf036e2715310472d0cb2643f~tplv-tiktokx-cropcenter:100:100.jpeg?dr=9640&refresh_token=c026a43d&x-expires=1778907600&x-signature=lLDTvGBI1a%2F4%2B9CcCl5E4yQTiRw%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5',
    emoji: '🔥'
  }
];

// ===== SVG icons =====
const tiktokSVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5
  2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01
  a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34
  6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
</svg>`;

// ===== STREAMER CARD HTML =====
function makeCard(s, i, small = false) {
  return `
    <a href="${s.url}" target="_blank" rel="noopener noreferrer"
       class="streamer-card${small ? ' streamer-card-sm' : ''}"
       style="animation-delay:${(i % 15) * 0.05}s">
      <div class="streamer-avatar-wrap">
        <img class="streamer-avatar-img" src="${s.thumb}" alt="${s.name}" loading="lazy"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
        <div class="streamer-avatar-fallback" style="display:none;"><span>${s.emoji}</span></div>
        <div class="live-ring"></div>
        <div class="live-badge">LIVE</div>
      </div>
      <div class="streamer-name">${s.fullName}</div>
      <div class="streamer-handle">@${s.handle}</div>
      <div class="streamer-link-btn">${tiktokSVG}查看主播</div>
    </a>`;
}

// ===== RENDER FEATURED STREAMERS =====
function renderStreamers(list) {
  const grid = document.getElementById('streamersGrid');
  if (!grid) return;
  if (list.length === 0) {
    grid.innerHTML = '<div class="no-results">😅 找不到符合的主播，請嘗試其他關鍵字</div>';
    return;
  }
  grid.innerHTML = list.map((s, i) => makeCard(s, i)).join('');
}

// ===== RENDER GOLD RANKING =====
function renderGoldRanking() {
  const el = document.getElementById('goldRankingList');
  if (!el) return;
  el.innerHTML = goldRanking.map((s, i) => `
    <a href="${s.url}" target="_blank" rel="noopener noreferrer" class="rank-card rank-${s.rank}">
      <div class="rank-medal">${s.medal}</div>
      <div class="rank-avatar-wrap">
        <img class="rank-avatar" src="${s.thumb}" alt="${s.name}" loading="lazy"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
        <div class="rank-avatar-fallback" style="display:none;"><span>${s.emoji}</span></div>
      </div>
      <div class="rank-info">
        <div class="rank-name">${s.fullName}</div>
        <div class="rank-handle">@${s.handle}</div>
      </div>
      <div class="rank-badge">第 ${s.rank} 名</div>
    </a>
  `).join('');
}

// ===== RENDER NEW STREAMERS =====
function renderNewStreamers() {
  const grid = document.getElementById('newStreamersGrid');
  if (!grid) return;
  grid.innerHTML = newStreamers.map((s, i) => makeCard(s, i, true)).join('');
}

// ===== SEARCH =====
function initSearch() {
  const input = document.getElementById('searchInput');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    const filtered = q
      ? streamers.filter(s =>
          s.name.toLowerCase().includes(q) ||
          s.fullName.toLowerCase().includes(q) ||
          s.handle.toLowerCase().includes(q))
      : streamers;
    renderStreamers(filtered);
  });
}

// ===== NAVBAR =====
function initNavbar() {
  const navbar   = document.getElementById('navbar');
  const burger   = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });
  burger?.addEventListener('click', () => {
    const open = navLinks?.classList.toggle('open');
    const spans = burger.querySelectorAll('span');
    if (open) {
      spans[0].style.transform = 'rotate(45deg) translate(5px,6px)';
      spans[1].style.opacity   = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(5px,-6px)';
    } else {
      spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    }
  });
  navLinks?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      burger?.querySelectorAll('span').forEach(s => { s.style.transform=''; s.style.opacity=''; });
    });
  });
}

// ===== COUNTER =====
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const steps  = 1800 / 16;
  const inc    = target / steps;
  let cur = 0;
  const t = setInterval(() => {
    cur += inc;
    if (cur >= target) { el.textContent = target; clearInterval(t); }
    else el.textContent = Math.floor(cur);
  }, 16);
}
function initCounters() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { animateCounter(e.target); obs.unobserve(e.target); } });
  }, { threshold: 0.5 });
  document.querySelectorAll('.stat-num').forEach(el => obs.observe(el));
}

// ===== PARTICLES =====
function initParticles() {
  const c = document.getElementById('particles');
  if (!c) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const sz = Math.random() * 3 + 1.5;
    p.style.cssText = `left:${Math.random()*100}%;width:${sz}px;height:${sz}px;
      animation-duration:${Math.random()*14+9}s;animation-delay:-${Math.random()*16}s;`;
    c.appendChild(p);
  }
}

// ===== SCROLL REVEAL =====
function initScrollReveal() {
  const targets = document.querySelectorAll(
    '.about-grid > *, .platform-card, .feature-item, .join-content, .section-header, .contact-grid > *, .event-card, .rank-card, .activity-block'
  );
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        setTimeout(() => {
          e.target.style.opacity   = '1';
          e.target.style.transform = 'translateY(0) scale(1)';
        }, +(e.target.dataset.delay || 0));
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });
  targets.forEach((el, i) => {
    el.style.opacity    = '0';
    el.style.transform  = 'translateY(28px) scale(0.98)';
    el.style.transition = 'opacity 0.65s cubic-bezier(.4,0,.2,1), transform 0.65s cubic-bezier(.4,0,.2,1)';
    el.dataset.delay    = (i % 6) * 80;
    obs.observe(el);
  });
}

// ===== TICKER =====
function initTicker() {
  const t = document.getElementById('tickerInner');
  if (t) t.innerHTML += t.innerHTML;
}

// ===== TOAST =====
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ===== CONTACT FORM (mailto) =====
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const data     = new FormData(form);
    const name     = data.get('name')    || '';
    const contact  = data.get('contact') || '';
    const type     = data.get('type')    || '';
    const message  = data.get('message') || '';
    const subject  = encodeURIComponent(`[脈動傳媒官網] ${type || '詢問'} — ${name}`);
    const body     = encodeURIComponent(
      `姓名：${name}\n聯絡方式：${contact}\n合作類型：${type}\n\n訊息內容：\n${message}\n\n---\n透過脈動傳媒官方網站聯絡表單送出`
    );
    window.location.href = `mailto:pulse.Pop9@proton.me?subject=${subject}&body=${body}`;
    showToast('✅ 正在開啟郵件程式，請確認寄出！');
    form.reset();
  });
}

// ===== SMOOTH SCROLL =====
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 74, behavior: 'smooth' });
    });
  });
}

// ===== ACTIVE NAV =====
function initActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const links    = document.querySelectorAll('.nav-links a');
  window.addEventListener('scroll', () => {
    let cur = '';
    sections.forEach(s => { if (window.scrollY >= s.offsetTop - 140) cur = s.id; });
    links.forEach(a => { a.style.color = a.getAttribute('href') === `#${cur}` ? 'var(--white)' : ''; });
  }, { passive: true });
}

// ===== CURSOR GLOW =====
function initCursorGlow() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  const g = document.createElement('div');
  g.style.cssText = `position:fixed;pointer-events:none;z-index:0;width:400px;height:400px;border-radius:50%;
    background:radial-gradient(circle,rgba(232,57,42,0.06) 0%,transparent 65%);
    transform:translate(-50%,-50%);transition:left .14s ease,top .14s ease;will-change:left,top;`;
  document.body.appendChild(g);
  document.addEventListener('mousemove', e => { g.style.left=e.clientX+'px'; g.style.top=e.clientY+'px'; }, { passive: true });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  renderStreamers(streamers);
  renderGoldRanking();
  renderNewStreamers();
  initSearch();
  initNavbar();
  initCounters();
  initParticles();
  initScrollReveal();
  initContactForm();
  initSmoothScroll();
  initActiveNav();
  initCursorGlow();
  initTicker();
});
