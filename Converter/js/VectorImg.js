/**
***  created by celin 
*/

//删除外接矩形阈值
var MinHeightTd=30;
var MaxHeightTd=60;
var MinWidthTd=30;
var MaxWidthTd=60;

var roads=[];//记录全部通道的像素点坐标
var pts=[];//记录每条通道的像素点坐标
var newpts=[];//记录压缩前每条通道的像素点坐标
var finalpts=[];//记录压缩后每条通道的像素点坐标
var newroads=[];//记录压缩后的全部通道的像素点坐标
var BTag;//标记
var contours1=[];//构建存储轮廓线

var neighborhood = 
  [ [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1] ];

//图像处理

var EdgeTd=document.getElementById('EdgeTd').value;//边缘检测阈值
var BinaryTd=document.getElementById('BinaryTd').value;//二值化阈值
var DeleteTd=document.getElementById('DeleteTd').value;//删除多余点阈值

function process(imgId,imgSrc){
	clear();
	EdgeTd=document.getElementById('EdgeTd').value;//边缘检测阈值
    BinaryTd=document.getElementById('BinaryTd').value;//二值化阈值
    DeleteTd=document.getElementById('DeleteTd').value;//删除多余点阈值

	var grayImg=cvCreateImage(imgSrc.width,imgSrc.height);
	var filterImg=cvCreateImage(imgSrc.width,imgSrc.height);
	var cannyImg=cvCreateImage(imgSrc.width,imgSrc.height);
	var imgDst=cvCreateImage(imgSrc.width,imgSrc.height);
	var thinimg=cvCreateImage(imgSrc.width,imgSrc.height);
	cvCvtColor(imgSrc,grayImg,CV_CODE.RGB2GRAY);//灰度化
	cvSmooth(grayImg,filterImg,CV_SMOOTH_TYPE.GAUSSIAN,3,3);//高斯滤波
	cvCanny(filterImg,cannyImg, EdgeTd, 255);//边缘检测
	var regions=GetContours(cannyImg);
	var Minregions=GetMinRect(regions,MinHeightTd,MinWidthTd);
	imgDst=DeletePix(Minregions,grayImg);
	cvSmooth(imgDst,imgDst,CV_SMOOTH_TYPE.GAUSSIAN,3,3);//高斯滤波
	cvThreshold(imgDst,imgDst,BinaryTd,1,CV_THRESHOLD_TYPE.THRESH_BINARY_INV);//二值化
	thinimg=ThinImg(imgDst);//细化操作
    var multiimg=MultiplyImg(thinimg);//像素值乘以255
	cvShowImage(imgId,multiimg);//显示图片

	var divimg=DivideImg(multiimg);//像素值除以255
	VectorImg(divimg);//矢量化
	PostProcess();//后处理，得到svg数据源
}

//细化算法
function ThinImg(imgSrc){
	var width=imgSrc.width;
	var height=imgSrc.height;
	var newimg=cvCloneImage(imgSrc);
	var mFlag=[]; //用于标记需要删除的点 
	while (true)  
	{  
		for (var i = 0; i < height ;i++)  
		{  
			for (var j = 0; j < width; j++)  
			{  
					//如果满足四个条件，进行标记  
					//  p9 p2 p3  
					//  p8 p1 p4  
					//  p7 p6 p5  
			    var p1 = newimg.RGBA[(j + i * width) * CHANNELS];//得到所在行列的像素值
			    if (p1 != 1) continue;  //边界点本身的标记为1
				var p4 = (j == width - 1) ? 0 : newimg.RGBA[(j + 1 +i * width) * CHANNELS];
				var p8 = (j == 0) ? 0 : newimg.RGBA[(j - 1 + i * width) * CHANNELS];
				var p2 = (i == 0) ? 0 : newimg.RGBA[(j + (i - 1) * width) * CHANNELS];  
				var p3 = (i == 0 || j == width - 1) ? 0 :newimg.RGBA[(j + 1 + (i - 1) * width) * CHANNELS] ;  
				var p9 = (i == 0 || j == 0) ? 0 : newimg.RGBA[(j - 1 + (i - 1) * width) * CHANNELS];  
				var p6 = (i == height - 1) ? 0 : newimg.RGBA[(j + (i + 1) * width) * CHANNELS];  
				var p5 = (i == height - 1 || j == width - 1) ? 0 : newimg.RGBA[(j + 1 + (i + 1) * width) * CHANNELS];  
				var p7 = (i == height - 1 || j == 0) ? 0 : newimg.RGBA[(j - 1+ (i + 1) * width) * CHANNELS];  

				if ((p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9) >= 2 && (p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9) <= 6)  
				{  
					var ap = 0;  
					if (p2 == 0 && p3 == 1) ap++;  
					if (p3 == 0 && p4 == 1) ap++;  
					if (p4 == 0 && p5 == 1) ap++;  
					if (p5 == 0 && p6 == 1) ap++;  
					if (p6 == 0 && p7 == 1) ap++;  
					if (p7 == 0 && p8 == 1) ap++;  
					if (p8 == 0 && p9 == 1) ap++;  
					if (p9 == 0 && p2 == 1) ap++;  

					if (ap == 1 && p2 * p4 * p6 == 0 && p4 * p6 * p8 == 0)  
					{  
						//标记  
						mFlag.push([i,j]);  
					}  
				}  
			}  
		}  
	
		//将标记的点删除  
		for (var i = 0;i < mFlag.length; i++) 
		{  
			 newimg.RGBA[(mFlag[i][0] * width+mFlag[i][1]) * CHANNELS]=0;
			 newimg.RGBA[1+(mFlag[i][0] * width+mFlag[i][1]) * CHANNELS]=0;
			 newimg.RGBA[2+(mFlag[i][0] * width+mFlag[i][1]) * CHANNELS]=0;

		}  

		//直到没有点满足，算法结束  
		if (mFlag.length==0)  
		{  
			break;  
		}  
		else  
		{  
			mFlag.splice(0, mFlag.length);//将mFlag清空  
		}  

		//对点标记  
		for (var i = 0; i < height; ++i)  
		{  
			for (var j = 0; j < width; ++j)  
			{  
				//如果满足四个条件，进行标记  
				//  p9 p2 p3  
				//  p8 p1 p4  
				//  p7 p6 p5  
				var p1 =newimg.RGBA[(j + i * width) * CHANNELS];
				if (p1 != 1) continue;  //边界点本身的标记为1
				var p4 = (j == width - 1) ? 0 : newimg.RGBA[(j + 1 +i * width) * CHANNELS];
				var p8 = (j == 0) ? 0 : newimg.RGBA[(j - 1 + i * width) * CHANNELS];
				var p2 = (i == 0) ? 0 : newimg.RGBA[(j + (i - 1) * width) * CHANNELS];  
				var p3 = (i == 0 || j == width - 1) ? 0 :newimg.RGBA[(j + 1 + (i - 1) * width) * CHANNELS] ;  
				var p9 = (i == 0 || j == 0) ? 0 : newimg.RGBA[(j - 1 + (i - 1) * width) * CHANNELS];  
				var p6 = (i == height - 1) ? 0 : newimg.RGBA[(j + (i + 1) * width) * CHANNELS];  
				var p5 = (i == height - 1 || j == width - 1) ? 0 : newimg.RGBA[(j + 1 + (i + 1) * width) * CHANNELS];  
				var p7 = (i == height - 1 || j == 0) ? 0 : newimg.RGBA[(j - 1+ (i + 1) * width) * CHANNELS];  

				if ((p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9) >= 2 && (p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9) <= 6)  
				{  
					var ap = 0;  
					if (p2 == 0 && p3 == 1) ap++;  
					if (p3 == 0 && p4 == 1) ap++;  
					if (p4 == 0 && p5 == 1) ap++;  
					if (p5 == 0 && p6 == 1) ap++;  
					if (p6 == 0 && p7 == 1) ap++;  
					if (p7 == 0 && p8 == 1) ap++;  
					if (p8 == 0 && p9 == 1) ap++;  
					if (p9 == 0 && p2 == 1) ap++;  

					if (ap == 1 && p2 * p4 * p8 == 0 && p2 * p6 * p8 == 0)  
					{  
						//标记  
						mFlag.push([i,j]);  
					}  
				}  
			}  
		}  

		//将标记的点删除  
		for (var i = 0;i < mFlag.length; i++) 
		{  
			newimg.RGBA[(mFlag[i][0] * width+mFlag[i][1]) * CHANNELS]=0;
			newimg.RGBA[1+(mFlag[i][0] * width+mFlag[i][1]) * CHANNELS]=0;
			newimg.RGBA[2+(mFlag[i][0] * width+mFlag[i][1]) * CHANNELS]=0;

		}  

		//直到没有点满足，算法结束  
		if (mFlag.length==0)  
		{  
			break;  
		}  
		else  
		{  
			mFlag.splice(0, mFlag.length);//将mFlag清空  
		}  
	}
    return newimg;  

}

//轮廓提取
function findContours(imageSrc){
  var contours = [], src = imageSrc.RGBA,
      width = imageSrc.width - 2, height = imageSrc.height - 2,
      pos = width + 3, nbd = 1,
      deltas, pix, outer, hole, i, j;

  deltas = neighborhoodDeltas(width + 2);

  for (i = 0; i < height; ++ i, pos += 2){
  
    for (j = 0; j < width; ++ j, ++ pos){
      pix = src[pos];

      if (0 !== pix){
        outer = hole = false;

        if (1 === pix && 0 === src[pos - 1]){
          outer = true;
        }
        else if (pix >= 1 && 0 === src[pos + 1]){
          hole = true;
        }

        if (outer || hole){
          ++ nbd;
          
          contours.push(borderFollowing(src, pos, nbd,
            {x: j, y: i}, hole, deltas) );
        }
      }
    }
  }  

  return contours;
}

function borderFollowing(src, pos, nbd, point, hole, deltas){
  var contour = [], pos1, pos3, pos4, s, s_end, s_prev;

  contour.hole = hole;
      
  s = s_end = hole? 0: 4;
  do{
    s = (s - 1) & 7;
    pos1 = pos + deltas[s];
    if (src[pos1] !== 0){
      break;
    }
  }while(s !== s_end);
  
  if (s === s_end){
    src[pos] = -nbd;
    contour.push( {x: point.x, y: point.y} );

  }else{
    pos3 = pos;
    s_prev = s ^ 4;

    while(true){
      s_end = s;
    
      do{
        pos4 = pos3 + deltas[++ s];
      }while(src[pos4] === 0);
      
      s &= 7;
      
      if ( ( (s - 1) >>> 0) < (s_end >>> 0) ){
        src[pos3] = -nbd;
      }
      else if (src[pos3] === 1){
        src[pos3] = nbd;
      }

      contour.push( {x: point.x, y: point.y} );
      
      s_prev = s;

      point.x += neighborhood[s][0];
      point.y += neighborhood[s][1];

      if ( (pos4 === pos) && (pos3 === pos1) ){
        break;
      }
      
      pos3 = pos4;
      s = (s + 4) & 7;
    }
  }

  return contour;
}


function neighborhoodDeltas(width){
  var deltas = [], len = neighborhood.length, i = 0;
  
  for (; i < len; ++ i){
    deltas[i] = neighborhood[i][0] + (neighborhood[i][1] * width);
  }
  
  return deltas.concat(deltas);
}

function approxPolyDP(contour, epsilon){
  var slice = {start_index: 0, end_index: 0},
      right_slice = {start_index: 0, end_index: 0},
      poly = [], stack = [], len = contour.length,
      pt, start_pt, end_pt, dist, max_dist, le_eps,
      dx, dy, i, j, k;
  
  epsilon *= epsilon;
  
  k = 0;
  
  for (i = 0; i < 3; ++ i){
    max_dist = 0;
    
    k = (k + right_slice.start_index) % len;
    start_pt = contour[k];
    if (++ k === len) {k = 0;}
  
    for (j = 1; j < len; ++ j){
      pt = contour[k];
      if (++ k === len) {k = 0;}
    
      dx = pt.x - start_pt.x;
      dy = pt.y - start_pt.y;
      dist = dx * dx + dy * dy;

      if (dist > max_dist){
        max_dist = dist;
        right_slice.start_index = j;
      }
    }
  }

  if (max_dist <= epsilon){
    poly.push( {x: start_pt.x, y: start_pt.y} );

  }else{
    slice.start_index = k;
    slice.end_index = (right_slice.start_index += slice.start_index);
  
    right_slice.start_index -= right_slice.start_index >= len? len: 0;
    right_slice.end_index = slice.start_index;
    if (right_slice.end_index < right_slice.start_index){
      right_slice.end_index += len;
    }
    
    stack.push( {start_index: right_slice.start_index, end_index: right_slice.end_index} );
    stack.push( {start_index: slice.start_index, end_index: slice.end_index} );
  }

  while(stack.length !== 0){
    slice = stack.pop();
    
    end_pt = contour[slice.end_index % len];
    start_pt = contour[k = slice.start_index % len];
    if (++ k === len) {k = 0;}
    
    if (slice.end_index <= slice.start_index + 1){
      le_eps = true;
    
    }else{
      max_dist = 0;

      dx = end_pt.x - start_pt.x;
      dy = end_pt.y - start_pt.y;
      
      for (i = slice.start_index + 1; i < slice.end_index; ++ i){
        pt = contour[k];
        if (++ k === len) {k = 0;}
        
        dist = Math.abs( (pt.y - start_pt.y) * dx - (pt.x - start_pt.x) * dy);

        if (dist > max_dist){
          max_dist = dist;
          right_slice.start_index = i;
        }
      }
      
      le_eps = max_dist * max_dist <= epsilon * (dx * dx + dy * dy);
    }
    
    if (le_eps){
      poly.push( {x: start_pt.x, y: start_pt.y} );

    }else{
      right_slice.end_index = slice.end_index;
      slice.end_index = right_slice.start_index;

      stack.push( {start_index: right_slice.start_index, end_index: right_slice.end_index} );
      stack.push( {start_index: slice.start_index, end_index: slice.end_index} );
    }
  }
  
  return poly;
}

//获取轮廓,最小外接矩形,用垂直水平矩形
function GetContours(imgSrc){
	contours1=findContours(imgSrc);
	var contours_poly=[];
	var boundRect=[];
	for(var i=0;i<contours1.length;i++)
	{
		contours_poly.push(approxPolyDP(contours1[i],3));
        boundRect.push(minRect(contours_poly[i]));
	}
	return boundRect;
}

function minRect(contourpoly){
	var MaxX=0;
	var MaxY=0;
	var MinX=Number.MAX_VALUE;
	var MinY=Number.MAX_VALUE;

	for(var i=0;i<contourpoly.length;i++)
	{
		var X=contourpoly[i].x;
		var Y=contourpoly[i].y;
		if(X>MaxX)
		{
			MaxX=X;
		}
		if(X<MinX)
		{
			MinX=X;
		}
		if(Y>MaxY)
		{
			MaxY=Y;
		}
		if(Y<MinY)
		{
			MinY=Y;
		}
	}
	var width=MaxX-MinX;
	var height=MaxY-MinY;
	var Rect=new CvRect(MinX,MinY,width,height);
	return Rect;
}

//获取需要删除的像素的外接矩形
function GetMinRect(regions,h,w){
	var minrect=[];
	if(regions.length>0)
	{
		for(var i=0;i<regions.length;i++)
		{
			if(regions[i].height<h&&regions[i].width<w)
			{
				minrect.push(regions[i]);
			}
		}
	}
	return minrect;
}

//删除外接矩形包含的像素
function DeletePix(regions,iplImage){
	var newimg=cvCloneImage(iplImage);
	if(regions.length>0)
	{
		for(var i=0;i<regions.length;i++)
		{
			for(var y=regions[i].y;y<regions[i].y+regions.height;y++)
			{
				for(var x=regions[i].x;x<regions[i].x+regions[i].width;x++)
				{
					newimg.RGBA[x + y * regions[i].width]=255;
				}
			}
		}

	}
	return newimg;
}

//像素值*255
function MultiplyImg(imgSrc)
{
	var width=imgSrc.width;
	var height=imgSrc.height;
	var imgDst = cvCreateImage(imgSrc.width, imgSrc.height);
	for (var i = 0; i < height ;i++)  
	{  
		for (var j = 0; j < width; j++)  
		{
			var value=imgSrc.RGBA[(j + i * imgDst.width) * CHANNELS] * 255;
			imgDst.RGBA[(j + i * imgDst.width) * CHANNELS] =value;
            imgDst.RGBA[1 + (j + i * imgDst.width) * CHANNELS]=value;
            imgDst.RGBA[2 + (j + i * imgDst.width) * CHANNELS]=value;
		}
	}
	return imgDst;
}

//像素值/255
function DivideImg(imgSrc)
{
	var width=imgSrc.width;
	var height=imgSrc.height;
	var imgDst = cvCreateImage(imgSrc.width, imgSrc.height);
	for (var i = 0; i < height ;i++)  
	{  
		for (var j = 0; j < width; j++)  
		{
			var value=imgSrc.RGBA[(j + i * imgDst.width) * CHANNELS] / 255;
			imgDst.RGBA[(j + i * imgDst.width) * CHANNELS] =value;
            imgDst.RGBA[1 + (j + i * imgDst.width) * CHANNELS]=value;
            imgDst.RGBA[2 + (j + i * imgDst.width) * CHANNELS]=value;
		}
	}
	return imgDst;
}

//获取像素点八领域
//输入：像素点pt,iplimage图像
//输出：pt的八领域像素点坐标集合
function GetNer(pt,iplImage){
	var width=iplImage.width;
	var height=iplImage.heigth;
	var x=pt.x;
	var y=pt.y;
	var NerPoints=[];//八邻域点集
	//p5 p4 p3
	//p6 p  p2
	//p7 p0 p1
	var p0 =(x == height-1) ? new CvPoint(0,0) : new CvPoint(x+1, y); 
	var p1 =(x == height-1 || y == width-1) ?new CvPoint(0,0) : new CvPoint(x+1, y + 1); 
	var p2 =(y == width - 1) ? new CvPoint(0,0) :new CvPoint(x, y + 1); 
	var p3 = (x == 0 || y == width-1) ? new CvPoint(0,0) : new CvPoint(x-1, y + 1);  
	var p4 = (x == 0) ? new CvPoint(0,0) : new CvPoint(x-1, y); 
	var p5 = (x == 0 || y == 0) ? new CvPoint(0,0) : new CvPoint(x-1,y-1);  
	var p6 = (y == 0) ? new CvPoint(0,0) :new CvPoint(x, y - 1); 
	var p7 = (x == height - 1 || y == 0) ? new CvPoint(0,0) :new CvPoint(x+1, y-1);  
	NerPoints.push(p0,p1,p2,p3,p4,p5,p6,p7);
    return NerPoints;
}

//矢量化算法
//输入：二值化后的iplImage图像
function VectorImg(iplImage){
	var newimg=cvCloneImage(iplImage);
	var width=iplImage.width;
	var height=iplImage.height;
	for(var i=0;i<height;i++)
	{
		for(var j=0;j<width;j++)
		{
			if(newimg.RGBA[(j + i * width)* CHANNELS]===1)
			{
				var p=new CvPoint(i,j);//获得像素值为1的点
				FindNer(p,iplImage);
		    }
		}
	}

}

function Getnewpts(index){
	return roads[index];
}
function FindNer(pt,iplimage){
	var index = 0;
	var width=iplimage.width;
	var height=iplimage.height;
	pts.push(pt);
	var nerpts=[];
	nerpts=GetNer(pt,iplimage);//获取pt八领域坐标
	var state=true;
	while(state)
	{
		//获取pt八领域坐标的像素值
		var nervalue=iplimage.RGBA[(nerpts[index].x * width + nerpts[index].y)* CHANNELS];
		//获取pt坐标的像素值
		var value=iplimage.RGBA[(pt.x * width + pt.y)* CHANNELS];

		if(nervalue===0)
		{
			index++;
			if(index===nerpts.length)
			{
				iplimage.RGBA[(pt.x * width + pt.y)* CHANNELS]=0;
				roads.push(pts);//将通道存入roads
			    pts=[];//清空pts
				return;
			}
		}
		else if(nervalue===1)
		{
			iplimage.RGBA[(pt.x * width + pt.y)* CHANNELS]=0;//pt像素清零
			FindNer(nerpts[index],iplimage);
			state=false;
		}

	}
}

//计算点到直线的距离
function Distance(l,r,n){
	var a,b,c;
	var x1,x2,y1,y2,x,y;
	var dis=0;

	y1=newpts[l].y;
	x1=newpts[l].x;
	x2=newpts[r].x;
	y2=newpts[r].y;
	x=newpts[n].x;
	y=newpts[n].y;

	if(x1==x2)
	{
		dis=Math.abs(x - x1);///两点式失效的情况
		return dis;
	}
	//解析直线
	a=(y2 - y1)/(x2 - x1);
	b=-1;
	c=y1 - (y2 - y1)/(x2 - x1) * x1;

	dis=Math.abs(a * x + b * y + c)/Math.sqrt(a * a + b * b);
	return dis;
}

//Douglas一Peuker算法  
//输入：左侧点leftpt,右侧点rightpt,阈值tolerance
function DP(leftpt,rightpt,tolerance){
	var i;
	var dis;
	var maxindex=0;
	var maxdis=0;//最大距离
	for(i=leftpt;i<rightpt;i++)
	{
		dis=Distance(leftpt,rightpt,i);//计算距离
		if(dis>maxdis)
		{
			maxdis=dis;
			maxindex=i;
		}
	}
	if(maxdis>tolerance)
	{
		BTag[maxindex]=1;//进行标记
		DP(leftpt,maxindex,tolerance);//回调函数
		DP(maxindex,rightpt,tolerance);//回调函数
	}
}

//后处理
function PostProcess(){
	for(var i=0;i<roads.length;i++)
	{
		newpts=Getnewpts(i);
		var nums=newpts.length;
		BTag=new Array(nums);
		//BTag数组赋初值为0
		for(var k=0;k<nums;k++)
		{
			BTag[k]=0;
		}
		DP(0, nums - 1, DeleteTd);
		for (var j = 0; j<nums; j++)
		{
			BTag[0] = 1;
			BTag[nums - 1] = 1;
			if (BTag[j])
			{
				finalpts.push(newpts[j]);
			}
		}
		if (finalpts.length>= 2)
		{
			newroads.push(finalpts);//得到压缩后的坐标点集合
		}
		finalpts=[];
	}
}

function getfinalpts(index){
	return newroads[index];
}

function clear(){
	roads=[];
	pts=[];
	newpts=[];
	finalpts=[];
	newroads=[];
}

var downloadSvgFile = function(mobileCode) {

    if(mobileCode==null) {

        mobileCode ='';
    } 
    var nums,i,j;
	var FinalPoints=[];
	nums=newroads.length;

	mobileCode=mobileCode+"<?xml version=\"1.0\" standalone=\"no\"?>";
	mobileCode=mobileCode+"\n";
	mobileCode=mobileCode+"<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\"";
	mobileCode=mobileCode+"\n";
	mobileCode=mobileCode+"\"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">";
	mobileCode=mobileCode+"\n";
	mobileCode=mobileCode+"<svg width=\"100%%\" height=\"100%%\" version=\"1.1\"";
	mobileCode=mobileCode+"\n";
	mobileCode=mobileCode+"xmlns=\"http://www.w3.org/2000/svg\">";
	mobileCode=mobileCode+"\n";
	for(i=0;i<nums;i++)
	{
		FinalPoints=getfinalpts(i);
		mobileCode=mobileCode+"<polyline points=\"";
		for(j=0;j<FinalPoints.length;j++)
		{
			mobileCode=mobileCode+FinalPoints[j].y+","+FinalPoints[j].x;
			if(j!=FinalPoints.length-1)
			{
				mobileCode=mobileCode+" ";
			}
			else
			{
				mobileCode=mobileCode+"\"";
				mobileCode=mobileCode+"\n";
				mobileCode=mobileCode+"style=\"fill:white;stroke:black;stroke-width:2\"/>";
				mobileCode=mobileCode+"\n";

			}
		}
		if(i==nums-1)
		{
			mobileCode=mobileCode+"</svg>";

		}
	}

	var file = new File([mobileCode], "Output.svg", { type: "text/plain;charset=utf-8" });
    saveAs(file);
}