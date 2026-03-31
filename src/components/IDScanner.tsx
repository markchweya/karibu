"use client";
import React,{useRef,useState,useEffect}from"react";
import Webcam from"react-webcam";
import Tesseract from"tesseract.js";

export default function IDScanner({onDetected}:{onDetected:(data:{name:string,id:string})=>void}){

const webcamRef=useRef<Webcam>(null);
const[status,setStatus]=useState("Initializing scanner...");

// store recent OCR guesses to stabilize result
const historyRef=useRef<{name:string,id:string}[]>([]);

useEffect(()=>{
const start=setTimeout(()=>scanLoop(),1200);
return()=>clearTimeout(start);
},[]);

const chooseBest=(items:{name:string,id:string}[])=>{
const idCount:Record<string,number>={};
const nameCount:Record<string,number>={};

for(const it of items){
idCount[it.id]=(idCount[it.id]||0)+1;
nameCount[it.name]=(nameCount[it.name]||0)+1;
}

const bestId=Object.entries(idCount).sort((a,b)=>b[1]-a[1])[0]?.[0];
const bestName=Object.entries(nameCount).sort((a,b)=>b[1]-a[1])[0]?.[0];

if(bestId && bestName){
return {id:bestId,name:bestName};
}
return null;
};

const scanLoop=async()=>{

if(!webcamRef.current){
setStatus("Waiting for camera...");
setTimeout(scanLoop,1000);
return;
}

const imageSrc=webcamRef.current.getScreenshot();

if(!imageSrc){
setStatus("Camera ready...");
setTimeout(scanLoop,1000);
return;
}

try{
setStatus("Scanning ID...");

const result=await Tesseract.recognize(imageSrc,"eng");

const raw=(result.data.text||"").toUpperCase();

const lines=raw
.replace(/:/g," ")
.split("\n")
.map(l=>l.trim())
.filter(Boolean);

let name="";
let id="";

// detect ID number using explicit labels first
for(let i=0;i<lines.length;i++){
const line=lines[i];
if(line.includes("ID") || line.includes("NUMBER") || line.includes("NO")){
const next=lines[i+1];
if(next){
const digits=next.replace(/[^0-9]/g,"");
if(digits.length>=7 && digits.length<=9){
id=digits;
break;
}
}
}
}

// fallback ID detection
if(!id){
for(const line of lines){
if(line.includes("SERIAL")) continue;
const digits=line.replace(/[^0-9]/g,"");
if(digits.length>=7 && digits.length<=9){
id=digits;
break;
}
}
}

// detect name strictly after FULL NAMES label
for(let i=0;i<lines.length;i++){
const line=lines[i];

// OCR may read FULL NAMES slightly wrong (FULL NAME, FULL NANE, etc)
if(line.includes("FULL")){
const next=lines[i+1];

if(next){
const clean=next.replace(/[^A-Z ]/g,"").trim();
const parts=clean.split(" ").filter(Boolean);

// Kenyan names typically 2–3 words
if(parts.length>=2 && parts.length<=3){
name=parts.join(" ");
break;
}
}
}
}

// fallback name detection
if(!name){
for(const line of lines){
const clean=line.replace(/[^A-Z ]/g,"").trim();

if(clean.includes("REPUBLIC")||clean.includes("KENYA")||clean.includes("DISTRICT")) continue;

const parts=clean.split(" ").filter(Boolean);

if(parts.length>=2 && parts.length<=4){
name=parts.join(" ");
break;
}
}
}

if(name && id){

historyRef.current.push({name,id});

// keep last 6 scans
if(historyRef.current.length>6){
historyRef.current.shift();
}

if(historyRef.current.length>=3){
const best=chooseBest(historyRef.current);

if(best){
setStatus("ID detected ✓");
onDetected(best);
return;
}
}

setStatus("Stabilizing scan...");
}

}catch(e){
console.error(e);
setStatus("Scanning...");
}

setTimeout(scanLoop,1300);
};

return(
<div className="space-y-3">

<div className="relative">
<Webcam
ref={webcamRef}
screenshotFormat="image/jpeg"
videoConstraints={{facingMode:"environment"}}
className="rounded w-full"
/>

<div className="absolute inset-0 border-4 border-green-500 rounded pointer-events-none"></div>
</div>

<div className="text-center text-sm font-semibold">{status}</div>

<div className="text-xs text-center text-gray-500">
Hold the Kenyan ID steady in the frame
</div>

</div>
);
}
