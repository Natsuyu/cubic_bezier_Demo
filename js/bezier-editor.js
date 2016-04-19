(function(){
	
	Object.prototype.$ = function $(x){
		var that = this==window?document:this;
		return Array.prototype.slice.call(that.querySelectorAll(x),0);
	}
	
	//兼容绑定事件
	function addEvent(event, callback, obj){
	    if(window.addEventListener) 
	        obj.addEventListener(event, callback);
	    else if(window.attachEvent)
	        obj.attachEvent("on"+event, callback);
	    else obj["on"+event]=callback;
	};
	
	//初始化的几个曲线
	var libExample = [
		[0, 0 ,1 ,1, "linear"], 
		[0.25, 0.1, 0.25, 1, "ease"], 
		[0.42, 0, 1, 1,"ease-in"], 
		[0, 0, 0.58, 1, "ease-out"], 
		[0.42, 0, 0.58, 1, "ease-in-out"]
	];
	
	//判断浏览器的前缀
	var prefix = ["webkit","Moz","o","ms",""];
	var _prefix = (function(tmp){
		var ret = "";
		for(var i in prefix){
			ret = prefix[i]+"Transition";
			if(tmp.style[ret] != undefined)
				return "-" + prefix[i].toLowerCase() + "-";
		}
		return false;
	})(document.createElement(bezierEditor));

	//计算两点间的距离
	function distance(x1,x2,y1,y2){
		return (x1-x2)*(x1-x2)+(y1-y2)*(y1-y2);
	}

	/**
	 * 生成贝赛尔曲线的编辑器
	*
	 * @param {object} ele          包含编辑器的块元素
	 * @param {object} setting      默认的配置
	 * @param {object} drawbox      拖动模块
	 * @param {object} preview      调节预览效果时间模块
	 * @param {object} compare      比较两个曲线效果模块
	 * @param {object} library      存放曲线库的模块
	 * @param {object} export       输出代码的按钮
	 * @param {object} import       导入函数参数的按钮
	 * @param {object} importbox    导入函数参数的模块
	 * @param {object} tip          提示导入的参数是否错误的节点
	 * @param {object} funcTitle    实时显示构造的节点
	 * @param {object} save         到处构造的曲线参数的节点
	 * @param {object} show         使滑块滑动的按钮
	 * @param {object} cover        导出参数的弹窗
	 * @param {number} timeDuration 展示模块的滑动时间
	 * @param {number} transFunc    存放构造的曲线的css代码
	 * @param {number} side         判断展示模块的滑动方向
	 * @param {number} index        当前选取曲线库中的哪个曲线
	 * @returns void
	*
	 * @date 2016-04-11
	 * @author 黄夏钰
	*/

	var bezierEditor = (function(){
		function bezierEditor(ele, option){
			this.ele = ele;
			this.setting = Object.prototype.bezierEditor.Default;
			this.drawbox = new item(this.ele.$(this.setting.drawbox.class)[0],this.setting.drawbox);
			this.preview = new item(this.ele.$(this.setting.preview.class)[0],this.setting.preview);
			this.compare = new item(this.ele.$(this.setting.compare.class)[0],this.setting.compare);
			this.library = new item(this.ele.$(this.setting.library.class)[0],this.setting.library);
			this.importbox = new item(this.ele.$(this.setting.importbox.class)[0],this.setting.importbox);
			
			this.export = this.ele.$(this.setting.export)[0];
			this.import = this.ele.$(this.setting.import)[0];
			
			this.funcTitle = this.ele.$(this.setting.funcTitle)[0];
			this.save = this.ele.$(this.setting.save)[0];
			this.show = this.ele.$(this.setting.show)[0];
			this.cover = this.ele.$(this.setting.cover)[0];

			this.timeDuration = 3;
			this.transFunc = "cubic-bezier(0,1,1,0)";
			
			this.side = false;
			this.index = 0;
			this._initController();
			this.initEvent();
		};

		bezierEditor.prototype = {
			_initController: function(){
				//生成画布和画布控件，一些参数的初始化
				this.drawbox.init = function(delta){
					if(delta != undefined) this.deltax = delta;  //注意变量为0的时候也是if中判断值也是false

					var canvas = document.createElement("canvas");
					canvas.width = this.setting.size
					canvas.height = this.setting.size*2;
					this.canvas = canvas;
					this.ctx = canvas.getContext('2d');
					this.deltay = this.setting.size/2;

					var start = document.createElement("span");
					start.className = this.setting.start;
					this.start = start;
					start.style.cssText = "top:"+(this.deltay+canvas.width-this.setting.r)+"px; left:"+(this.deltax - this.setting.r)+"px";

					var end = document.createElement("span");
					end.className = this.setting.end;
					this.end = end;
					end.style.cssText = "top:"+(this.deltay-this.setting.r)+"px; right:"+(this.deltax - this.setting.r)+"px";

					var control1 = document.createElement("span");
					control1.className = this.setting.control1;
					this.control1 = control1;
					control1.style.cssText = "top:"+(this.deltay-this.setting.r)+"px; left:"+(this.deltax - this.setting.r)+"px";

					var control2 = document.createElement("span");
					control2.className = this.setting.control2;
					this.control2 = control2;
					control2.style.cssText = "top:"+(this.deltay+canvas.width-this.setting.r)+"px; right:"+(this.deltax - this.setting.r)+"px";

					this.ele.appendChild(canvas);
					this.ele.appendChild(start);
					this.ele.appendChild(end);
					this.ele.appendChild(control1);
					this.ele.appendChild(control2);

					this.x1 = 0,this.y1 = 0,this.x2 = 1, this.y2 = 1;
					this.dx = 0,this.dy = 0;
					this.tar = null;
				};
				this.preview.init = function(delta){
					if(delta) this.deltax = this.deltay = delta;
					this.control = this.ele.$(this.setting.durationControl)[0];
					this.range = this.ele.$(this.setting.rangeValue)[0];
					this.title = this.ele.$(this.setting.title)[0];

					this.range.innerHTML = this.control.value;
				};
				this.compare.init = function(delta){
					if(delta) this.deltax = this.deltay = delta;
					var bezier = document.createElement("canvas"),
						slider = document.createElement("canvas");
					var bezctx = bezier.getContext("2d"),
						slidctx= slider.getContext("2d");
					bezier.className = this.setting.bezier;
					slider.className = this.setting.slider;
					bezier.width = bezier.height = slider.width = slider.height = this.setting.size;

					this.bezier = bezier;
					this.slider = slider;
					this.bezctx = bezctx;
					this.slidctx = slidctx;

					this.ele.appendChild(bezier);
					this.ele.appendChild(slider);
				};
				this.library.init = function(delta){
					if(delta) this.deltax = this.deltay = delta;
					this.lib = [];
					for(var i=0;i<libExample.length;i++){
						this.appendLibrary(libExample[i],i);
					}
				};

				this.importbox.init = function(){
					this.tip = this.ele.$(this.setting.tip)[0];
					this.importItem = this.ele.$(this.setting.item + " input[type='text']");
					this.importTitle = this.ele.$(this.setting.title + " input[type='text']")[0];
				};

				this.drawbox.init(1);
				this.preview.init();
				this.compare.init(10);
				this.library.init(10);
				this.importbox.init();

				this.drawbox.drawBezier(true, [0, 1, 1, 0]);
				this.compare.changeBezier(this.drawbox.output());
				this.compare.drawBezier(false, libExample[0], this.compare.slider, this.compare.slidctx);
				this.funcTitle.innerHTML +="(0.00, 1.00, 1.00, 0.00)";
			},
			
			//对展示模块生成代码
			createStyle: function(){
				var dx = 0;
				if(!this.side) dx = this.compare.ele.offsetWidth - this.compare.bezier.offsetWidth;
				var transition1 = _prefix + "transition:all " + this.timeDuration + "s " + this.transFunc + ";";
				var transition2 = _prefix + "transition:all " + this.timeDuration + "s " + this._getChoosed() + ";";
				var transform = _prefix + "transform:translateX(" + dx + "px);";
				return [transition1+transform, transition2+transform];
			},

			//获得曲线参数的css代码
			_getTransFunc: function(output){
				if(!output) output = this.drawbox.output();

				var txt = "cubic-bezier(";
				for(var i=0;i<output.length;i++){
					if(i) txt += ", ";
					txt+=output[i].toFixed(2);
				}
				txt += ")";
				return txt;
			},

			//点击时候获得所选取的曲线库中的曲线参数的css代码
			_getChoosed: function(){
				var ret = "cubic-bezier(";
				var output = libExample[this.index];
				for(var i=0;i<output.length-1;i++){
					if(i) ret += ",";
					ret += output[i];
				}
				ret += ")";
				return ret;
			},

			//获得transition代码
			_getAnimation: function(prefix, transfunc){
				if(!prefix) prefix = "";
				if(!transfunc) transfunc = this.transFunc;
				return prefix + "transition:all " + this.timeDuration + "s " + transfunc + ";"
			},

			//拖动控制点的时候重新描绘相关画布
			_controlMove: function(top, left){
				var r = this.drawbox.setting.r,
					width = this.drawbox.canvas.width,
					deltax = this.drawbox.deltax,
					deltay = this.drawbox.deltay,
					tar = this.drawbox.tar;

				tar.style.top = top + "px";
				tar.style.left = left + "px";
				
				if(this.drawbox.tar == this.drawbox.control1) this.drawbox.x1 = (left + r - deltax) / width, this.drawbox.y1 = (top+r-deltay) / width;
				else this.drawbox.x2 = (left+r-deltax) / width, this.drawbox.y2 = (top+r-deltay) / width;
				this.transFunc = this._getTransFunc();
				this.drawbox.drawBezier(true, this.drawbox.output());
				this.compare.changeBezier(this.drawbox.output());
			},	

			//输出css代码
			exportCode: function(){
				var text = "";
				for(var i=0;i<libExample.length;i++){
					var x = libExample[i];
					text+="div."+x[4]+"<br>{<br>"+this._getAnimation(null, x.slice(0,4))+"<br>"+this._getAnimation(_prefix, x.slice(0,4))+"<br>}<br>";
				}
				this.cover.innerHTML = text;
			},

			//绑定相关事件
			initEvent: function(){
				var that = this;
				
				//拖动控件
				addEvent("mousedown", function(e){
					e = e || window.event;
					var tar = e.target;
					if(tar != that.drawbox.control1 && tar != that.drawbox.control2) return;
					that.drawbox.flag = true;
					var x = e.clientX,
						y = e.clientY;
					that.drawbox.dx = x - tar.offsetLeft; that.drawbox.dy = y - tar.offsetTop;
					that.drawbox.tar = tar;
				},window);

				addEvent("mouseup", function(e){
					that.drawbox.flag = false;
				},window);

				addEvent("mousemove", function(e){
					if(that.drawbox.flag){
						e = e || window.event;
						var tar = that.drawbox.tar;

						var x = e.clientX,
							y = e.clientY;
						var r = that.drawbox.setting.r,
							width = that.drawbox.canvas.width,
							deltax = that.drawbox.deltax,
							deltay = that.drawbox.deltay;

						var left = x- that.drawbox.dx ,
							top = y - that.drawbox.dy ;

						left = left<-r+deltax?-r+deltax:(left>width+deltax-r-1?width+deltax-r-1:left);

						that._controlMove(top, left);
						that.transFunc = that._getTransFunc();
						that.funcTitle.innerHTML = that.transFunc;
					}
				},window);

				//点击画布区域，可以精确移动控件
				addEvent("click",function(e){
					e = e || window.event;
					if(e.target == that.drawbox.control1 || e.target == that.drawbox.control2) return;
					var x = e.offsetX || layerX,
						y = e.offsetY || layerY;
					var x1 = that.drawbox.control1.offsetLeft,
						y1 = that.drawbox.control1.offsetTop,
						x2 = that.drawbox.control2.offsetLeft,
						y2 = that.drawbox.control2.offsetTop;
					var d1 = distance(x,x1,y,y1),
						d2 = distance(x,x2,y,y2);
					var tar = null;
					if(d1>d2) that.drawbox.tar = that.drawbox.control2;
					else that.drawbox.tar = that.drawbox.control1;

					that._controlMove(y, x);
					that.funcTitle.innerHTML = that.transFunc;
				},that.drawbox.ele);

				//选取曲线库中的函数
				addEvent("click",function(e){
					e = e || window.event;
					var tar = e.target,
						lib = that.library.lib;
					if(tar.tagName.toLowerCase() == "canvas"){
						that.index = that.library.findIndex(tar.offsetParent);
						for(var i=0;i<lib.length;i++)
						{
							lib[i].x.className  = "";
						}
						lib[that.index].x.className = "active";
						that.compare.drawBezier(false, libExample[that.index], that.compare.slider, that.compare.slidctx);
					}
				},that.library.ele);

				//改变展示模块的展示时间
				addEvent("change",function(){
					that.timeDuration = this.value;
					that.preview.range.innerHTML = this.value;
				},that.preview.control);

				//输出css代码
				addEvent("click", function(e){
					e = e || window.event;
					that.exportCode();
					that.cover.style.display = "block";
					e.stopPropagation ? e.stopPropagation() : e.stopDefault();
				},that.export);

				//展示
				addEvent("click", function(){
					var ret = that.createStyle();
					that.compare.bezier.style.cssText = ret[0];
					that.compare.slider.style.cssText = ret[1];
					that.side = !that.side;
				}, that.show);

				//导入添加的曲线函数
				addEvent("click", function(){
					var importItem = that.importbox.importItem;
					var tmp = [];
					for(var i = 0;i<importItem.length;i++){
						var x = parseFloat(importItem[i].value);
						if(isNaN(x)) break;
						if(x<-1.5 || x>2) break;
						tmp.push(x);
					}
					if(i==importItem.length){
						that.importbox.tip.innerHTML = "";
						libExample.push(tmp);
						tmp.push(that.importbox.importTitle.value);
						that.library.appendLibrary(tmp);
					}
					else{
						that.importbox.tip.innerHTML = "Incorrect";
					}
				}, that.import);

				//导出构造的函数的css代码
				addEvent("click", function(e){
					e = e || window.event;
					var style1 = that._getAnimation(_prefix),
						style2 = that._getAnimation();

					that.cover.innerHTML = "div{<br>"+style1+"<br>"+style2+"<br>}";
					that.cover.style.display = "block";
					e.stopPropagation ? e.stopPropagation() : e.stopDefault();
				}, that.save);

				//删除曲线库的函数
				addEvent("click", function(e){
					e = e || window.event;
					var tar = e.target;
					if(libExample.length == 1) return;
					if(tar.getAttribute("data-close") == "true"){
						var index = that.library.deleteItem(tar.offsetParent);
						
						if(index == that.index){
							if(index == libExample.length) that.index = libExample.length-1;
							that.library.lib[that.index].x.className = "active";
							that.compare.drawBezier(false, libExample[that.index], that.compare.slider, that.compare.slidctx);
						}else{
							if(index < that.index) that.index--; 
						}
					}
				}, that.library.ele);

				//点击非弹窗区域，关闭弹窗
				addEvent("click", function(e){
					e = e || window.event;
					var tar = e.target;
					if(tar != that.cover) that.cover.style.display = "none";
				}, window);
			}
		};

		function item(ele, option){
			this.ele = ele;
			this.setting = option;
			this.deltax = this.deltay = 5;
		};
		item.prototype = {
			//根据传入参数绘制曲线
			drawBezier: function(flag, pos, canvas, ctx, r){

				if(!canvas) canvas = this.canvas, ctx = this.ctx;
				if(!r) r = 2;

				var width = canvas.width,
					height = canvas.height,
					length = width - this.deltax*2,
					start = [this.deltax, height - this.deltay],
					end = [width-this.deltax,this.deltay],
					paint = this.setting.paint;
				ctx.clearRect(0,0,width,height);
				//画背景
				if(flag){
					var grad = ctx.createLinearGradient(0,0,0,height);
					grad.addColorStop(0,"#fff");
					grad.addColorStop(0.5,"#d6d6d6");

					grad.addColorStop(1, "#fff");
					ctx.fillStyle = grad;
					ctx.fillRect(0,0,width, height);

					ctx.strokeStyle = "#000";
					var color = ["#fff","#f0f0f0"],
						step = length/15;
					for(var i=0, j=this.deltay;i<15;i++,j+=step)
					{
						ctx.fillStyle = color[i%2];
						ctx.fillRect(this.deltax,j,length,step);
					}
					ctx.lineWidth = 1;
					ctx.beginPath();
					ctx.moveTo(this.deltax, this.deltay);
					ctx.lineTo(start[0], start[1]);

					ctx.lineTo(end[0], end[1]+length);
					ctx.stroke();
					ctx.closePath();
					ctx.beginPath();
					ctx.lineWidth = 8;
					ctx.strokeStyle = "rgba(200,200,200,0.5)";
					ctx.moveTo(start[0], start[1]);
					ctx.lineTo(end[0], end[1]);
					ctx.stroke();
					ctx.beginPath();
				}
				
				//画圆
				ctx.fillStyle = "#fff";
				ctx.beginPath();
				var x1 = Math.ceil(pos[0]*length + this.deltax), y1 = Math.ceil(length - pos[1]*length + this.deltay),
					x2 = Math.ceil(pos[2]*length + this.deltax), y2 = Math.ceil(length - pos[3]*length + this.deltay);
				ctx.arc(x1, y1, r, 0, Math.PI*2);
				ctx.arc(x2, y2, r, 0, Math.PI*2);
				ctx.fill();
				ctx.closePath();
				//画线
				ctx.lineWidth = paint.lineWidth;
				ctx.strokeStyle = paint.lineColor;
				ctx.beginPath();
				ctx.moveTo(start[0], start[1]);
				ctx.lineTo(x1, y1);
				ctx.stroke();
				ctx.closePath();
				ctx.beginPath();
				ctx.moveTo(end[0], end[1]);
				ctx.lineTo(x2, y2);
				ctx.stroke();
				ctx.closePath();
				
				//画贝塞尔曲线
				ctx.lineWidth = paint.curveWidth;
				ctx.strokeStyle = paint.curveColor;
				ctx.beginPath();
				ctx.moveTo(start[0], start[1]);
				ctx.bezierCurveTo(x1,y1,x2,y2,end[0], end[1]);
				
				ctx.stroke();
				ctx.closePath();
			},
			
			//输出参数在画布坐标中的位置
			output: function(){
				return [this.x1, 1-this.y1, this.x2, 1-this.y2];
			},

			//修改函数参数
			changeBezier: function(pos){
				this.drawBezier(false, pos,this.bezier, this.bezctx);
			},

			//曲线库的添加
			appendLibrary: function(pos,i){
				var wrapper = document.createElement("div");
				wrapper.className = this.setting.libitem;

				var x = document.createElement("canvas");
				var ctx = x.getContext("2d");
				x.width = x.height = this.setting.size;
				x.setAttribute("data-func",this.lib.length);

				var y = document.createElement("span");
				y.innerHTML = pos[4];

				var close = document.createElement("i");
				close.className = "iconfont close";
				close.setAttribute("data-close",true);
				close.innerHTML = "&#xe635;";

				if(i==0) x.className = "active";
				this.drawBezier(false, pos,x,ctx);
				wrapper.appendChild(x);
				wrapper.appendChild(y);
				wrapper.appendChild(close);

				this.ele.appendChild(wrapper);
				this.lib.push({wrapper: wrapper, x: x});
			},
			
			deleteItem: function(parent){
				var index = this.findIndex(parent);
				parent.offsetParent.removeChild(parent);
				this.lib.splice(index,1);
				libExample.splice(index,1);
				return index;
			},

			//寻找obj在曲线库中的下标
			findIndex: function(obj, name){
				for(var i=0;i<this.lib.length;i++){
					if(obj == this.lib[i].wrapper) {
						return i;
					}
				}
			}
		}
		
		return bezierEditor;
	})();
	Object.prototype.bezierEditor = function(option){
		return this.forEach(function(item){
			var data = item.data;
			if(!data) item.data = new bezierEditor(item,option);
			else console.log(data);
			return item.data;
		});
	};

	Object.prototype.bezierEditor.Default = {
		drawbox:{
			class: ".canvas",
			control1: "control1",
			control2: "control2",
			start: "start",
			end: "end",
			r: 10,
			size: 300,
			paint:{
				lineWidth: 2,
				curveWidth: 6,
				lineColor: "#606060",
				curveColor: "#000"
			}
		},
		preview:{
			class: ".preview",
			durationControl: ".duration",
			rangeValue: ".range-value",
			title: ".title"
		},
		compare:{
			class: ".compare",
			bezier: "bezier",
			slider: "fromlib",
			size: 60,
			paint:{
				lineWidth: 1,
				curveWidth: 2,
				lineColor: "#fff",
				curveColor: "#fff"
			}
		},
		library:{
			class: ".library",
			libitem:"canvas-item",
			choosed: "choosed",
			
			num:4,
			size: 100,
			paint:{
				lineWidth: 1,
				curveWidth: 2,
				lineColor: "#fff",
				curveColor: "#fff"
			}
		},
		importbox:{
			class: ".importbox",
			btn: ".import",
			item: ".import-item",
			title: ".import-title",
			tip: ".import-tip"
		},
		import:".import",
		show: ".show",
		export: ".export",
		funcTitle: ".func",
		save: ".save",
		cover: ".cover"
	}

})();
