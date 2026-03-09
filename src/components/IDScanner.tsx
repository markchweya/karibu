"use client";
import React,{useRef,useState,useEffect}from"react";
import Webcam from"react-webcam";
import Tesseract from"tesseract.js";

export default function IDScanner({onDetected}:{onDetected:(data:{name:string,id:string})=>void}){

const webcamRef=useRef<Webcam>(null);
const[status,setStatus]=useState("Initializing scanner...");

useEffect(()=>{
const start=setTimeout(()=>scanLoop(),1200);
return()=>clearTimeout(start);
},[]);

const scanLoop=async()=>{
if(!webcamRef.current){
setStatus("Waiting for camera...");
setTimeout(scanLoop,900);
return;
}

const imageSrc=webcamRef.current.getScreenshot();

if(!imageSrc){
setStatus("Camera ready...");
setTimeout(scanLoop,900);
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

// Detect ID number (Kenyan IDs usually 7–9 digits)
for(const line of lines){
if(line.includes("SERIAL")) continue;
const digits=line.replace(/[^0-9]/g,"");
if(digits.length>=7 && digits.length<=9){
id=digits;
break;
}
}

// Find FULL NAME line
for(let i=0;i<lines.length;i++){
const line=lines[i];

if(line.includes("FULL") || line.includes("NAME")){
const next=lines[i+1];

if(next){
const clean=next.replace(/[^A-Z ]/g,"").trim();
const parts=clean.split(" ").filter(Boolean);

if(parts.length>=2 && parts.length<=4){
name=parts.join(" ");
}
}
}
}

// fallback name detection
if(!name){
for(const line of lines){
const clean=line.replace(/[^A-Z ]/g,"").trim();
const parts=clean.split(" ").filter(Boolean);

if(parts.length>=2 && parts.length<=4){
if(!clean.includes("REPUBLIC") && !clean.includes("KENYA") && !clean.includes("DISTRICT")){
name=parts.join(" ");
break;
}
}
}
}

if(name && id){
setStatus("ID detected ✓");
onDetected({name,id});
return;
}

setStatus("Scanning Kenyan ID...");

}catch(e){
console.error(e);
setStatus("Scanning...");
}

setTimeout(scanLoop,1600);
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
Place the Kenyan ID inside the frame
</div>

</div>
);
}
