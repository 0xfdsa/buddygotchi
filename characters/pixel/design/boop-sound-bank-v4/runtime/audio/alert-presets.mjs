// Attention signals, not success fanfares. All layers are synthesized locally.
const tone=(at,duration,freq,amp,extra={})=>({at,duration,freq,amp,wave:'sine',attack:.001,decay:duration*.18,...extra});
const noise=(at,duration,amp,extra={})=>({at,duration,amp,wave:'noise',highpass:900,lowpass:7200,attack:.0003,decay:duration*.15,...extra});
const recipe=(duration,...layers)=>({duration,layers:layers.flat()});
export const alertEffects={
  alertSoftTap:recipe(.16,noise(0,.065,.34,{highpass:450,lowpass:3600,attack:.003,decay:.012}),tone(.003,.10,640,.12,{decay:.016})),
  alertPaperTap:recipe(.20,noise(0,.02,.38,{highpass:1300,decay:.004}),noise(.012,.12,.16,{highpass:800,lowpass:5700,decay:.025}),tone(.003,.065,910,.08,{decay:.012})),
  alertKeyboardTap:recipe(.18,noise(0,.018,.66,{highpass:1800,decay:.003}),noise(.015,.045,.28,{highpass:1000,decay:.008}),noise(.060,.035,.14,{highpass:2200,decay:.007}),tone(.002,.07,780,.16,{decay:.012})),
  alertBrickTap:recipe(.19,noise(0,.028,.64,{highpass:800,lowpass:4700,decay:.006}),noise(.018,.10,.22,{highpass:1800,lowpass:7000,decay:.019}),tone(.002,.10,420,.16,{decay:.020}),tone(.004,.045,1410,.06,{decay:.009})),
  alertRubberTap:recipe(.16,tone(0,.11,940,.16,{end:620,decay:.025}),noise(0,.03,.34,{highpass:900,lowpass:4300,decay:.006})),
  alertKnock:recipe(.24,
    noise(0,.022,.64,{highpass:1200,decay:.004}),noise(.004,.066,.22,{highpass:550,lowpass:4400,decay:.012}),
    tone(.002,.12,720,.22,{decay:.018}),tone(.003,.08,1730,.11,{decay:.011}),tone(.005,.046,2970,.05,{decay:.007})),
  alertDing:recipe(.88,
    tone(0,.80,1046.50,.31,{decay:.17}),tone(0,.64,2093,.085,{decay:.12}),
    tone(.002,.40,2911,.040,{decay:.06}),tone(.004,.38,523.25,.07,{decay:.07}),
    noise(0,.013,.14,{highpass:2300,decay:.002})),
  alertDong:recipe(1.02,
    tone(0,.95,783.99,.29,{decay:.20}),tone(.002,.65,1567.98,.080,{decay:.13}),
    tone(.003,.43,2181,.041,{decay:.085}),tone(.005,.40,392,.085,{decay:.065}),
    noise(0,.014,.13,{highpass:1700,decay:.0025})),
  alertBell:recipe(.98,
    tone(0,.90,1174.66,.27,{decay:.18}),tone(.002,.61,1902.95,.105,{decay:.11}),
    tone(.003,.40,3218.57,.051,{decay:.067}),tone(.005,.48,587.33,.09,{decay:.080}),
    noise(0,.016,.23,{highpass:1900,decay:.003}))
};
