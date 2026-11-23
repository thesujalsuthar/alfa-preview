// ALFACALC uses millimetres, minutes and metric lookup tables internally.
export const PITCHES=['10 / 14','8 / 12','6 / 10','5 / 8','4 / 6','3 / 4','2 / 3','1.4 / 2','1 / 1.3','0.75 / 1.25'];
export function band(value,limits){return limits.findIndex(limit=>value<=limit)}
export function pitchFor(value,shape){const limits=shape==='round'?[10,15,20,30,75,150,250,500,900,1200]:shape==='tube'?[15,20,25,50,100,200,400,800,1200]:[10,15,20,25,50,100,200,400,800,1200];const i=band(value,limits);if(i<0)throw Error('This cross-section is outside the supported pitch chart. Contact application support.');return PITCHES[i]}
export function calculate(input,data){
 const factor=input.units==='in'?25.4:1;const n=k=>Number(input[k])*factor;
 const [w,h,t,len,bw,bt]=['width','height','wall','bladeLength','bladeWidth','bladeThickness'].map(n);
 const rows=Number(input.rows),cols=Number(input.columns),pieces=rows*cols;
 if(![w,h,t,len,bw,bt].every(Number.isFinite)||!Number.isInteger(rows)||!Number.isInteger(cols)||rows<1||cols<1||pieces>1000)throw Error('Enter valid dimensions and a whole-number bundle between 1 and 1,000 pieces.');
 if(w<=0||len<=0||bw<=0||bt<=0||bt>=bw||bw>=len)throw Error('Blade length, width and thickness must be positive and in descending order.');
 if(!['round','square','rectangle','pipe','tube','angle','ibeam','channel','wire'].includes(input.shape))throw Error('Select a supported stock shape.');
 const solid=['round','square','rectangle'].includes(input.shape),pipe=input.shape==='pipe';let area,height,pitch,chart;
 if(['rectangle','tube','angle','ibeam','channel'].includes(input.shape)&&h<=0)throw Error('Enter a positive stock height.');
 if(!solid&&input.shape!=='wire'&&(t<=0||t>=w/2||(['tube','ibeam','channel'].includes(input.shape)&&t>=h/2)))throw Error('Wall/web thickness must be positive and less than half the stock dimensions.');
 switch(input.shape){
  case 'round':case 'wire':area=Math.PI*w*w/4;height=w;break;
  case 'square':area=w*w;height=w;break;
  case 'rectangle':area=w*h;height=h;break;
  case 'pipe':area=Math.PI*(w*w-(w-2*t)**2)/4;height=w;break;
  case 'tube':area=w*h-(w-2*t)*(h-2*t);height=h;break;
  case 'angle':area=w*t+(h-t)*t;height=h;break;
  case 'channel':area=2*w*t+(h-2*t)*t;height=h;break;
  case 'ibeam':area=2*w*t+(h-2*t)*t;height=h;break;
 }
 area*=pieces;height*=rows;
 const grade=data.grades.find(g=>String(g.id)===String(input.grade)&&String(g.mat_cat_id)===String(input.category));
 if(!grade)throw Error('Choose a material category and a grade belonging to that category.');
 const aluminium=String(input.category)==='19';
 if(aluminium){pitch='3';chart={bs_min:70,bs_max:80,cr_min:47,cr_max:150};}
 else if(pipe){
  const d=band(w,[20,40,60,80,100,120,150,200,300,400,500,600,700]);const ti=band(t,[2,3,4,5,6,8,10,12,15,20,30,50,75,100,150,200]);
  if(d<0||ti<0)throw Error('Pipe dimensions exceed the supported chart. Contact application support.');
  pitch=data.pipeChart?.[[20,40,60,80,100,120,150,200,300,400,500,600,700][d]]?.[[2,3,4,5,6,8,10,12,15,20,30,50,75,100,150,200][ti]];
  if(!pitch)throw Error('The original lookup has no available pitch for this pipe size. Contact application support.');
 }else if(solid)pitch=pitchFor(w*cols,input.shape);
 else if(input.shape==='tube')pitch=pitchFor(w*cols,'tube');
 else {const v=input.shape==='wire'?w:t;const i=band(v,[3,4,5,7,15,30,1200]);if(i<0)throw Error('Thickness exceeds the supported chart.');pitch=PITCHES[i]}
 if(!chart){const range=solid?(w*cols<=25?'1':w*cols<=75?'2':w*cols<=150?'3':'4'):['14','10 / 14','8 / 12','6 / 10'].includes(pitch)?'1':['5 / 8','4 / 6'].includes(pitch)?'2':pitch==='3 / 4'?'3':'4';chart=data.ranges[range]?.find(v=>String(v.id)===String(grade.id)&&String(v.mat_cat_id)===String(input.category));}
 if(!chart)throw Error('No cutting-rate data is available for this combination. Contact application support.');
 const [bsMin,bsMax,crMin,crMax]=['bs_min','bs_max','cr_min','cr_max'].map(k=>Number(chart[k]));
 if(![bsMin,bsMax,crMin,crMax].every(v=>Number.isFinite(v)&&v>0)||bsMin>bsMax||crMin>crMax)throw Error('The legacy rate data is incomplete or inconsistent for this grade. Contact application support.');
 const averageTpi=pitch.split('/').map(Number).reduce((a,b)=>a+b,0)/pitch.split('/').length;
 const minutes=area/(crMax*100),feed=height/minutes,teeth=len*averageTpi/25.4,cycles=bsMax*1000/len,chipload=feed/(cycles*teeth);
 let product=aluminium?'sw-al':!solid?(pipe&&w>400&&t>30?'warrior':'sw-ic'):['10 / 14','8 / 12','6 / 10','14'].includes(pitch)?'sw-ms':['5 / 8','4 / 6','3 / 4'].includes(pitch)?([2500,2650,2540,2800].some(v=>Math.abs(v-len)<.01)?'sw-ms':'sw-sas'):pitch==='2 / 3'?([27,34].some(v=>Math.abs(v-bw)<.01)?'sw-sas':'warrior'):'warrior';
 return {product,pitch,area,height,pieces,bsMin,bsMax,crMin,crMax,minutes,feed,teeth,cycles,chipload,grade:grade.mat_grade,blade:{length:len,width:bw,thickness:bt}};
}
