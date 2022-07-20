function genSpriteCtrlWords(x,y,h, attached) {
	var HSTART = v(x + getElemInt10('sprtOfsX'));
	var VSTART = v(y + getElemInt10('sprtOfsY'));
	var VSTOP  = v(VSTART + h);

	// SPRxPOS:
	var pos = 0;
	// Bits 0-7 contain the high 8 bits of HSTART
	pos |= (HSTART >> 1) & 255;
	// Bits 8-15 contain the low 8 bits of VSTART
	pos |= (VSTART & 255) << 8;


	// SPRxCTL:
	var ctl = 0;
	// Bit 0           The HSTART low bit
	ctl |= HSTART & 1;
	// Bit 1           The VSTOP high bit (bit 9)
	ctl |= ((VSTOP >> 8) & 1) << 1;
	// Bit 2           The VSTART high bit (bit 9)
	ctl |= ((VSTART >> 8) & 1) << 2;
	// Bits 6-3        Unused (make zero)
	// Bit 7           (Used in attachment)
	if (attached)
		ctl |= 1 << 7;
	// Bits 15-8       The low eight bits of VSTOP
	ctl |= (VSTOP & 255) << 8;

	return {pos:pos, ctl:ctl};
}

var xtypes="unsigned short";


function getChunkyPix(x,y) {
	if (x < 0) return 0;
	if (y < 0) return 0;
	if (x >= cropW) return 0;
	if (y >= cropH) return 0;
	return pixelsPaletteIndex[x + y * cropW];
}


var saveSession = null;

function startSaveSession() {
	var d = new Date();
	saveSession = ";\tGrab export from file: " +  export_fileName + "\n;\t" + d + "\n";	
}

function endSaveSession() {
	if (!saveSession)
		return;
	var blob = new Blob([saveSession], { type: "text/plain;charset=utf-8" });
	var fileName = export_fileName + ".asm";
	saveAs(blob, fileName);	
	saveSession = null;
}

function saveSprite(_saveWindow) {
	setElemValue('viewShow','viewShow_sprites');
	
	if (!_saveWindow) {
		if (!spriteWindow)
			_saveWindow = {x:0, y:0, w:workCanvas.width, h:workCanvas.height};
		else {
			_saveWindow = {x:spriteWindow.x, y:spriteWindow.y, w:spriteWindow.w, h:spriteWindow.h};
		}
	}
	if (!_saveWindow.label)
		_saveWindow.label = getElemValue('sprtName');

	var sprtScrX	= 0;
	var sprtScrY	= 0;
	var includeCtrl	= isElemChecked('includeCtrl');
	if (includeCtrl) {
		sprtScrX	= getElemInt10('sprtScrX');
		sprtScrY	= getElemInt10('sprtScrY');	
	}
	var includePal	= isElemChecked('includePal');
	var skpEmpty	= isElemChecked('skpEmpty');
	var sprtC		= getElemInt10('sprtC');
    var mode 		= getElemValue('sprtMode');
	
	var paletteNumEntries = global_palette.length;
	var attached = false;
	if (paletteNumEntries >	 4) {
		if (paletteNumEntries >	 16) {
			alert("Can't export Sprites:  - Wrong palette size - Found " + paletteNumEntries + " colors, but the Sprites export supports 16 colors max.");
			return;
		}
		attached = true;
	}

	var xportASM = false;
	var xportC = false;
	var singleBin = false;
    if (mode === "sprtASM") xportASM = true;
    else if (mode === "sprt1C") xportC = true;
    else if (mode === "sprtBin") xportASM = false;
    else if (mode === "sprt1Bin") {
		xportASM = false;
		singleBin = true;
	}
    else alert("unknown Sprite export mode: " + mode);

	if (includePal && (!xportASM) && (!xportC)) {
		alert("Palette can't be exported with sprites in binary mode. Use the \"Save Palette\" button instead");
		return;
	}

	var d = new Date();
	var singleBinFAT = ";\tSprites export from file: " +  export_fileName + "\n";
	singleBinFAT += ";" +  d.toString() + "\n\n;Sprites offsets:\n";
	
	var save2Clipboard = false;
	var mode2 = document.getElementById("sprtSaveTo").value;
	if (mode2 === "sprt_clipBoard") {
		if ((mode === "sprtBin") || (mode === "sprt1Bin"))
			alert("can't save binary sprite to clipboard.");
		else
			save2Clipboard = true;
	}
	
	var types2 = document.getElementById("sprtSaveAs").value;
	if(types2 === "sprt_amiga_types")xtypes="word";


	var sprtName = _saveWindow.label;

	var sprtH = getElemInt10('sprtH');
	

	var bitplaneHeight = _saveWindow.h;

	var w;
	var writeSpr0Low;
	var writeSpr0High;
	var writeSpr1Low;
	var writeSpr1High;
	var img = pixelsPaletteIndex;
	var data;
	var data1;
	var writeIndex;
	var coveredWidth = 0;
	var coveredHeight = 0;
	var d = new Date();
	var asmStr = ";\tSrpite(s) export from file: " +  export_fileName + "\n";
	asmStr += ";\t" +  d.toString() + "\n\n\tdata_c\n\n";
	var cStr = "//\tSrpite(s) export from file: " +  export_fileName + "\n";
	cStr += "//\t" +  d.toString() + "\n\n";
	var allExported = ";\texportedSprites:\tdc.l ";
	var exportNumber = 0;

	var binSize = 0;
	if (singleBin) {
		if (includeCtrl) {
			binSize = sprtC * (4 * bitplaneHeight + 4);
			data = new Uint8Array(binSize);
			data.fill(0);
			data1 = new Uint8Array(binSize);
			data1.fill(0);
			writeIndex = 0;
			writeIndex1 = 0;
		}
		else {
			binSize = sprtC * (4 * bitplaneHeight);
			data = new Uint8Array(binSize);
			data.fill(0);
			data1 = new Uint8Array(binSize);
			data1.fill(0);
			writeIndex = 0;
			writeIndex1 = 0;
		}	
	}


	while (coveredHeight < _saveWindow.h) {
		while (coveredWidth < _saveWindow.w) {
			var thisName = sprtName;
			if (!saveSession)
				thisName += "_" + exportNumber;
			exportNumber++;
			var sprtStr = thisName;
			var sprtAttachedStr = thisName + "_attached";
			var sprtCStr = xtypes+" " + thisName + "[] = {\n";
			var sprtAttachedCStr = xtypes+" " + thisName + "_attached[] = {\n";
			if (coveredWidth > 0)
				allExported += ", ";
			allExported += sprtStr + ", " + sprtAttachedStr;
			sprtStr += ":\n";
			sprtAttachedStr += ":\n";
			singleBinFAT += thisName + "\tEQU\t" + writeIndex + "\n";
			if (attached)
				singleBinFAT += thisName + "_attached\tEQU\t" + (writeIndex + binSize) + "\n";
			if (singleBin) {
				if (includeCtrl) {
					var words = genSpriteCtrlWords(coveredWidth + sprtScrX, coveredHeight + sprtScrY, sprtH, false);
					data[writeIndex++] = words.pos>>8; // write control words
					data[writeIndex++] = words.pos&255;
					data[writeIndex++] = words.ctl>>8;				
					data[writeIndex++] = words.ctl&255;				
					words = genSpriteCtrlWords(coveredWidth + sprtScrX, coveredHeight + sprtScrY, sprtH, attached);
					data1[writeIndex1++] = words.pos>>8;
					data1[writeIndex1++] = words.pos&255;
					data1[writeIndex1++] = words.ctl>>8;
					data1[writeIndex1++] = words.ctl&255;
				}
			} else {
				if (includeCtrl) {
					var words = genSpriteCtrlWords(coveredWidth + sprtScrX, coveredHeight + sprtScrY, sprtH, false);
					sprtStr += "\tdc.w\t$" + v(words.pos & 65535).toString(16) + ", $" + v(words.ctl & 65535).toString(16) + "\t; control words\n";
					sprtCStr += "\t0x" + v(words.pos & 65535).toString(16) + ",0x" + v(words.ctl & 65535).toString(16) + "\t// control words\n";
					words = genSpriteCtrlWords(coveredWidth + sprtScrX, coveredHeight + sprtScrY, sprtH, attached);
					sprtAttachedStr += "\tdc.w\t$" + v(words.pos & 65535).toString(16) + ", $" + v(words.ctl & 65535).toString(16) + "\t; control words\n";
					sprtAttachedCStr += "\t0x" + v(words.pos & 65535).toString(16) + ",0x" + v(words.ctl & 65535).toString(16) + "\t// control words\n";
					data = new Uint8Array(4 * bitplaneHeight + 4);
					data.fill(0);
					data1 = new Uint8Array(4 * bitplaneHeight + 4);
					data1.fill(0);
					writeIndex = 4;
					writeIndex1 = 4;
				}
				else {
					data = new Uint8Array(4 * bitplaneHeight);
					data.fill(0);
					data1 = new Uint8Array(4 * bitplaneHeight);
					data1.fill(0);
					writeIndex = 0;
					writeIndex1 = 0;
				}	
			}
	
			var hasData = false;
			for (var lineIndex = 0; lineIndex < sprtH; lineIndex++) {
				writeSpr0Low = 0;
				writeSpr0High = 0;
				writeSpr1Low = 0;
				writeSpr1High = 0;
				for (var x = 0; x < 8; x++) {
					var bitindex = 7 - x;
					var col = getChunkyPix(coveredWidth + x + _saveWindow.x, coveredHeight + lineIndex + _saveWindow.y);
					writeSpr0Low |= (col & 1) << bitindex;
					writeSpr0High |= ((col & 2)>>1) << bitindex;
					writeSpr1Low |= ((col & 4)>>2) << bitindex;
					writeSpr1High |= ((col & 8)>>3) << bitindex;
				}
				writeSpr0Low <<= 8;
				writeSpr0High <<= 8;
				writeSpr1Low <<= 8;
				writeSpr1High <<= 8;
				for (var x = 0; x < 8; x++) {
					var bitindex = 7 - x;
					var col = getChunkyPix(coveredWidth + x + _saveWindow.x + 8, coveredHeight + lineIndex + _saveWindow.y);
					writeSpr0Low |= (col & 1) << bitindex;
					writeSpr0High |= ((col & 2)>>1) << bitindex;
					writeSpr1Low |= ((col & 4)>>2) << bitindex;
					writeSpr1High |= ((col & 8)>>3) << bitindex;
				}

				if ((writeSpr0Low !== 0) ||
					(writeSpr0High !== 0) ||
					(writeSpr1Low !== 0) ||
					(writeSpr1High !== 0))
				{
					hasData = true;
				}
				sprtStr += "\tdc.w\t";
				sprtCStr += "\t";
				w = writeSpr0Low >> 8;
				sprtStr += "$"+TwoCharStringHEX(w);
				sprtCStr += "0x"+TwoCharStringHEX(w);
				data[writeIndex++] = w;
				w = writeSpr0Low & 0xff;
				sprtStr += TwoCharStringHEX(w)+", ";
				sprtCStr += TwoCharStringHEX(w)+",";
				data[writeIndex++] = w;
				w = writeSpr0High >> 8;
				sprtStr += "$"+TwoCharStringHEX(w);
				sprtCStr += "0x"+TwoCharStringHEX(w);
				data[writeIndex++] = w;
				w = writeSpr0High & 0xff;
				sprtStr += TwoCharStringHEX(w)+"\n";
				sprtCStr += TwoCharStringHEX(w)+",\n";
				data[writeIndex++] = w;

				sprtAttachedStr += "\tdc.w\t";
				sprtAttachedCStr += "\t";
				w = writeSpr1Low >> 8;
				sprtAttachedStr += "$"+TwoCharStringHEX(w);
				sprtAttachedCStr += "0x"+TwoCharStringHEX(w);
				data1[writeIndex1++] = w;
				w = writeSpr1Low & 0xff;
				sprtAttachedStr += TwoCharStringHEX(w)+", ";
				sprtAttachedCStr += TwoCharStringHEX(w)+",";
				data1[writeIndex1++] = w;
				w = writeSpr1High >> 8;
				sprtAttachedStr += "$"+TwoCharStringHEX(w);
				sprtAttachedCStr += "0x"+TwoCharStringHEX(w);
				data1[writeIndex1++] = w;
				w = writeSpr1High & 0xff;
				sprtAttachedStr += TwoCharStringHEX(w)+"\n";
				sprtAttachedCStr += TwoCharStringHEX(w)+",\n";
				data1[writeIndex1++] = w;
			}
			if (saveSession) {
				saveSession += sprtStr + "\n";
				if (attached)
					saveSession += sprtAttachedStr + "\n";
				saveSession += ";========================================\n\n";
			} else {
				if ((!skpEmpty) || (hasData)) {
					if (xportASM) {
						asmStr += sprtStr + "\n";
						if (attached)
							asmStr += sprtAttachedStr + "\n";
						asmStr += ";========================================\n\n";
					} else if (xportC) {
						// a function to remove the last ,
						var last_comma=sprtCStr.lastIndexOf(',');
						sprtCStr=sprtCStr.slice(0,last_comma) +
						sprtCStr.slice(last_comma + 1);


						cStr += sprtCStr ;
						if (attached)
							cStr += sprtAttachedCStr + "\n";
						cStr += "};\n//========================================\n\n";
					} else if (!singleBin){
						var blob = new Blob([data], {type: "application/octet-stream"});
						var fileName = thisName + ".bin";
						saveAs(blob, fileName);	
		
						if (attached) {
							var blob = new Blob([data1], {type: "application/octet-stream"});
							var fileName = thisName + "_attached.bin";
							saveAs(blob, fileName);	
						}
					}	
				}	
			}
			coveredWidth += 16;
			sprtC--;
			if (sprtC <= 0)
				break;
		}
		coveredHeight += sprtH;
		if (sprtC <= 0)
			break;
}


if (saveSession)
	return;

	if (xportASM){
		if (includePal) {
			var palStr = sprtName + "_palette:\n";			
			asmStr += savePalette(palStr) + "\n\n";
		}
		asmStr += "\n\n" + allExported;	
		if (save2Clipboard) {
			copyStringToClipboard(asmStr);
			alert("done copying the Sprite data to the clipboard");
		} else {
			var blob = new Blob([asmStr], { type: "text/plain;charset=utf-8" });
			var fileName = sprtName + ".asm";
			saveAs(blob, fileName);	
		}
	} if (xportC) {
		if (includePal) {
			var palStr = xtypes+" " + sprtName + "_palette[] = {\n";			
			cStr += savePaletteC(palStr) + "};\n\n";
		}
		if (save2Clipboard) {
			copyStringToClipboard(cStr);
			alert("done copying the Sprite data to the clipboard");
		} else {
			var blob = new Blob([cStr], { type: "text/plain;charset=utf-8" });
			var fileName = sprtName + ".c";
			saveAs(blob, fileName);	
		}
	} else {
		if (singleBin){
			if (attached) {
				var mergedArray = new Uint8Array(data.length + data1.length);
				mergedArray.set(data);
				mergedArray.set(data1, data.length);
				data = mergedArray;
			}
			var blob = new Blob([data], {type: "application/octet-stream"});
			var fileName = sprtName + ".bin";
			saveAs(blob, fileName);
			var blob = new Blob([singleBinFAT], { type: "text/plain;charset=utf-8" });
			var fileName = sprtName + "_FAT.asm";
			saveAs(blob, fileName);
		}	
	}
}


function saveBobs(_saveWindow) {
	setElemValue('viewShow','viewShow_bobs');

	if (!_saveWindow) {
		if (!spriteWindow)
			_saveWindow = {x:0, y:0, w:workCanvas.width, h:workCanvas.height};
		else {
			_saveWindow = {x:spriteWindow.x, y:spriteWindow.y, w:spriteWindow.w, h:spriteWindow.h};
		}
	}
	if (!_saveWindow.label)
		_saveWindow.label = getElemValue('bobName');

	if (global_palette.length > 32) {
		alert("Can't export Bobs:  - Wrong palette size - Found " + global_palette.length + " colors, but the Bobs export supports 32 colors max. You can only use 'Save RGB' with this image .");
		return;
	}

	var save2Clipboard = false;
	var mode2 = getElemValue("bobSaveTo");
	if (mode2 === "bob_clipBoard") {
		if ((mode === "bobBin") || (mode === "bobSingleBin"))
			alert("can't save binary Bob to clipboard.");
		else
			save2Clipboard = true;
	}

	var bobW = parseInt(document.getElementById('bobW').value,10);
	var bobH = parseInt(document.getElementById('bobH').value,10);
	var bobC = parseInt(document.getElementById('bobC').value,10);
	var bobName = _saveWindow.label;
	var includePal = document.getElementById('bobIncludePal').checked;
	var interleave = document.getElementById('bobInterlace').checked;
	var bobSkpEmpty = document.getElementById('bobSkpEmpty').checked;

	const XPORT_ASM = 0;
	const XPORT_MULTIPLE_BIN = 1;
	const XPORT_SINGLE_BIN = 2;
	const XPORT_C = 3;

	var xportMode = XPORT_ASM;
    var mode = document.getElementById("bobMode").value;
    if (mode === "bobASM") xportMode = XPORT_ASM;
    else if (mode === "bobBin") xportMode = XPORT_MULTIPLE_BIN;
    else if (mode === "bobSingleBin") xportMode = XPORT_SINGLE_BIN;
    else if (mode === "bob1C") xportMode = XPORT_C;
    else {
		alert("unknown Bob export mode: " + mode + ". Fallbacking to .asm mode");
		xportMode = XPORT_ASM;
	}

	if ((bobW&7)!=0) {
		alert(" - ABORTING - WRONG BOB WIDTH - SHOULD BE A MULTIPLE OF 8 - FOUND: " + bobW + " PIX WIDTH.");
		return;
	}

	var bytesPerLine = v(bobW/8);
	var bplSize = v(bobH * bytesPerLine);

	var bitplanesCount = 0;
	var colCount = global_palette.length;
	var startCol = 0;
	if (isColor0Locked()) {
		startCol = 1;
		colCount--;
	}

	if (colCount > 16 ) bitplanesCount = 5;
	else if (colCount > 8) bitplanesCount = 4;
	else if (colCount > 4) bitplanesCount = 3;
	else if (colCount > 2) bitplanesCount = 2;
	else if (colCount > 0) bitplanesCount = 1;

	var asmStr = ";\tBob(s) export from file: " +  export_fileName + "\n";
	var d = new Date();
	asmStr += ";\t" +  d.toString() + "\n\n\tdata_c\n\n";
	var allExported = ";\texportedBobs:\tdc.l ";

	var CStr = "//\tBob(s) export from file: " +  export_fileName + "\n";
	CStr += "//\t" +  d.toString() + "\n\n";

	var singleBitplanesData = null;
	if (includePal) {
		singleBitplanesData = new Uint8Array(bobC * bitplanesCount * bplSize + global_palette.length * 2);
	} else {
		singleBitplanesData = new Uint8Array(bobC * bitplanesCount * bplSize);
	}

	singleBitplanesData.fill(0);
	var singleWriteIndex = 0;	
	var singleBinFAT = ";\tBob(s) export from file: " +  export_fileName + "\n";
	singleBinFAT += ";" +  d.toString() + "\n\n;Bob offsets:\n";

	var curStartY = 0;
	var exportNumber = 0;
	while(curStartY < _saveWindow.h) {
		var curStartX = 0;
		while(curStartX < _saveWindow.w) {
			var bitplanesData = new Uint8Array(bitplanesCount * bplSize);
			bitplanesData.fill(0);
			var writeIndex = 0;
			var hasData = false;
		
			var thisName = bobName;
			if (!saveSession)
				thisName += "_" + exportNumber;
			exportNumber++;

			var bobStr = thisName;
			if (curStartX > 0)
				allExported += ", ";
			allExported += bobStr + ", ";
			bobStr += ":\t;" +  bobW + "*" + bobH + " pix, " + bitplanesCount + " bitplanes\n";

			var bobCStr = "unsigned char " + thisName + "[] = {\t//" +  bobW + "*" + bobH + " pix, " + bitplanesCount + " bitplanes\n";
					
			for (var iBpl = 0; iBpl < bitplanesCount; iBpl++) {
				var bplMask = 1 << iBpl;
				for (var y = 0; y < bobH; y++)
				{
					var xmask = 128;
					var thisByte = 0;
					for (var x = 0; x < bobW; x++)
					{
						var col = getChunkyPix(curStartX + x + _saveWindow.x, curStartY + y + _saveWindow.y);
						if ((col & bplMask) !== 0) {
							thisByte |= xmask;
						}
						xmask /= 2;
						if ((x & 7) === 7) {
							if (xmask !== 0.5)
								alert("xmask error");
							if (thisByte !== 0) {
								hasData = true;
							}
							bitplanesData[writeIndex++] = thisByte;
							xmask = 128;
							thisByte = 0;
						}
					}
				}
			}
			var fileName = thisName;
			if (hasData || (!bobSkpEmpty)) {
				if (interleave) {
					var interData = new Uint8Array(bitplanesData.length);
					interData.fill(0);
					var readIndexes = [];
					var rdIndex = 0;
					for (var i = 0; i < bitplanesCount; i++) {
						readIndexes.push(rdIndex);
						rdIndex += bplSize;
					}
					var w = 0;
					var asmData = null;
					for (var y = 0; y < bobH; y++) {
						var yofs = bytesPerLine * y;
						for (var iBpl = 0; iBpl < bitplanesCount; iBpl++) {
							for (var x = 0; x < bytesPerLine; x++) {
								interData[w++] = bitplanesData[readIndexes[iBpl] + x + yofs];
							}
						}
					}
					asmData = interData;
					if (xportMode === XPORT_MULTIPLE_BIN) {
						var blob = new Blob([interData], {type: "application/octet-stream"});
						var fname = fileName + ".bin";
						saveAs(blob, fname);
					}		
				} else {
					asmData = bitplanesData;
					if (xportMode === XPORT_MULTIPLE_BIN) {
						var blob = new Blob([bitplanesData], {type: "application/octet-stream"});
						var fname = fileName + ".bin";
						saveAs(blob, fname);
					}
				}
				if ((xportMode === XPORT_ASM) || (xportMode === XPORT_C)) {
					for (var dump = 0; dump < asmData.length; dump++) {
						var mod = dump % bytesPerLine;
						if (mod === 0) {
							bobStr += "\n\tdc.b\t";
							bobCStr += "\n\t";
						}
						bobStr += "$"+TwoCharStringHEX(asmData[dump]);
						bobCStr += "0x"+TwoCharStringHEX(asmData[dump]);
						if ((mod !== bytesPerLine - 1) && (dump < asmData.length-1)) {
							bobStr += ",";
						}	
						if (dump < asmData.length-1) {
							bobCStr += ",";
						}	
					}
					asmStr += bobStr + "\n";
					asmStr += ";========================================\n\n";
					CStr += bobCStr + "\n";
					CStr += "};\n\t========================================\n\n";
				} else if (xportMode === XPORT_SINGLE_BIN) {
					singleBinFAT += fileName + "\tEQU\t" + singleWriteIndex + "\n";
					for (var cpy = 0; cpy < asmData.length; cpy++) {
						singleBitplanesData[singleWriteIndex++] = asmData[cpy];
					}
				}
			}
			bobC--;
			if (bobC <= 0) {
				break;
			}
			curStartX += bobW;
		}
		if (bobC <= 0) {
			break;
		}
		curStartY += bobH;
	}

	if (xportMode === XPORT_ASM){
		if (includePal) {
			var palStr = bobName + "_palette:\n";			
			asmStr += savePalette(palStr) + "\n\n";
		}
		asmStr += "\n\n" + allExported;
		if (save2Clipboard) {
			copyStringToClipboard(asmStr);
			alert("done copying the Bob data to the clipboard");
		} else {		
			var blob = new Blob([asmStr], { type: "text/plain;charset=utf-8" });
			var fileName = bobName + ".asm";
			saveAs(blob, fileName);
		}
	} else if (xportMode === XPORT_C){
		if (includePal) {
			var palStr = xtypes+" " + bobName + "_palette[] = {\n";			
			CStr += savePaletteC(palStr) + "};\n\n";
		}
		if (save2Clipboard) {
			copyStringToClipboard(CStr);
			alert("done copying the Bob data to the clipboard");
		} else {		
			var blob = new Blob([CStr], { type: "text/plain;charset=utf-8" });
			var fileName = bobName + ".asm";
			saveAs(blob, fileName);
		}
	}
	else if (xportMode === XPORT_SINGLE_BIN) {
		if (includePal) {
			singleBinFAT += "\n"+ bobName + "_palette\tEQU\t" + singleWriteIndex;
			var startCol = 0;
			if (isColor0Locked()) {
				startCol = 1;
			}
			for (var i = startCol; i < global_palette.length; i++)
			{
				var r = nearest(global_palette[i].r);
				var g = nearest(global_palette[i].g);
				var b = nearest(global_palette[i].b);
				var ar = v(v(r>>4)&15);
				var ab = v(v(b>>4)&15);
					
				singleBitplanesData[singleWriteIndex++] = v(ar);
				singleBitplanesData[singleWriteIndex++] = v(ab | g);
			}
		}
		singleBinFAT += "\n"+ bobName + "_END\tEQU\t" + singleWriteIndex;
		var blob = new Blob([singleBinFAT], { type: "text/plain;charset=utf-8" });
		var fileName = bobName + "_FAT.asm";
		saveAs(blob, fileName);

		var fileName2 = bobName + ".bin";
		var blob2 = new Blob([singleBitplanesData], {type: "application/octet-stream"});
		saveAs(blob2, fileName2);
	}
}



function saveBpl() {
	if ((cropW&7)!=0) {
		alert("Can't export bitplanes:  - Wrong image width - Shoud be a multiple of 8 - Found: " + cropW + " pix width. Please adjust cropping values.");
		return;
	}

	var bytesPerLine = v(cropW/8);

	var bitplanesCount = 0;
	var colCount = global_palette.length;
	var startCol = 0;
	if (isColor0Locked()) {
		startCol = 1;
		colCount--;
	}

	if (colCount > 32) {
		alert("Can't export bitplanes:  - Wrong palette size - Found " + colCount + " colors, but the bitplane export supports 32 colors max. You can only use 'Save RGB' with this image .");
		return;
	}

	if (colCount > 16 ) bitplanesCount = 5;
	else if (colCount > 8) bitplanesCount = 4;
	else if (colCount > 4) bitplanesCount = 3;
	else if (colCount > 2) bitplanesCount = 2;
	else if (colCount > 0) bitplanesCount = 1;

	var xportBpl = [];
	xportBpl[0] = document.getElementById('xport1').checked;
	xportBpl[1] = document.getElementById('xport2').checked;
	xportBpl[2] = document.getElementById('xport3').checked;
	xportBpl[3] = document.getElementById('xport4').checked;
	xportBpl[4] = document.getElementById('xport5').checked;

	var interleave = document.getElementById('xportInterleave').checked;

	var actualBplXportCount  = 0;
	for (var i = 0; i < bitplanesCount; i++) {
		if (xportBpl[i])
			actualBplXportCount++;
	}


	var bplSize = v(cropH * bytesPerLine);
	var bitplanesData = new Uint8Array(actualBplXportCount * bplSize);
	bitplanesData.fill(0);
	if (actualBplXportCount == 0) {
	    alert(" - ABORTING - UNSUPPORTED BITPLANES COUNT: " + actualBplXportCount + " (" + colCount + " colors).");
		return;
	}

	var writeIndex = 0;

	for (var iBpl = 0; iBpl < bitplanesCount; iBpl++) {
		if (xportBpl[iBpl]) {
			var bplMask = 1 << iBpl;
			for (var y = 0; y < cropH; y++)
			{
				var xmask = 128;
				var thisByte = 0;
				for (var x = 0; x < cropW; x++)
				{
					var col = getChunkyPix(x,y);
					if ((col & bplMask) !== 0) {
						thisByte |= xmask;
					}
					xmask /= 2;
					if ((x & 7) === 7) {
						if (xmask !== 0.5)
							alert("xmask error");
						bitplanesData[writeIndex++] = thisByte;
						xmask = 128;
						thisByte = 0;
					}
				}
			}
		}
	}	

	if (interleave) {
		var interData = new Uint8Array(actualBplXportCount * bplSize);
		interData.fill(0);
		var readIndexes = [];
		var rdIndex = 0;
		for (var i = 0; i < bitplanesCount; i++) {
			if (xportBpl[i]) {
				readIndexes.push(rdIndex);
				rdIndex += bplSize;
			}
		}
		var w = 0;
		for (var y = 0; y < cropH; y++) {
			var yofs = bytesPerLine * y;
			for (var iBpl = 0; iBpl < bitplanesCount; iBpl++) {
				if (xportBpl[iBpl]) {
					for (var x = 0; x < bytesPerLine; x++) {
						interData[w++] = bitplanesData[readIndexes[iBpl] + x + yofs];
					}
				}
			}
		}

		var blob = new Blob([interData], {type: "application/octet-stream"});
		var fileName = export_fileName + "_bitplanes_interleaved.bin";
		saveAs(blob, fileName);	
	} else {
		var blob = new Blob([bitplanesData], {type: "application/octet-stream"});
		var fileName = export_fileName + "_bitplanes.bin";
		saveAs(blob, fileName);
	}

  }
 
  function saveRaw() {
	var dataSize = v(workImagePixels.length/4);
	var data = new Uint8Array(dataSize*2);
	data.fill(0);
	var chunkyRead = 0;
	var chunkyWrite = 0;
	for (var i = 0; i < dataSize; i++)
	{
		var r = nearest(workImagePixels[chunkyRead++]);
		var g = nearest(workImagePixels[chunkyRead++]);
		var b = nearest(workImagePixels[chunkyRead++]);
		chunkyRead++;
		r = v(v(r>>4)&15);
		g = v(v(g>>4)&15);
		b = v(v(b>>4)&15);
		data[chunkyWrite++] = v(r);
		data[chunkyWrite++] = v(v(g*16) + b);
	}
	
	var blob = new Blob([data], {type: "application/octet-stream"});
	var fileName = export_fileName + "_12bitRAW.bin";
	saveAs(blob, fileName);
	xport.value = xportstr;
  }

  function save4Bit() {
	if (global_palette.length > 16) {
		alert("Can't export indexes:  - Wrong palette size - Found " + global_palette.length + " colors, but the indexes export supports 16 colors max, as each palette index is stored on 4 bits.");
		return;
	}
	var data = new Uint8Array((cropW * cropH) / 2);
	data.fill(0);
	var readIndex = 0;
	var writeIndex = 0;
	while (readIndex < pixelsPaletteIndex.length) {
		var p1 = pixelsPaletteIndex[readIndex++];
		var p2 = pixelsPaletteIndex[readIndex++];
		p1 &= 15;
		p2 &= 15;
		var final = (p1<<4) | p2;
		data[writeIndex++] = final;
	}
	var palblob = new Blob([data], {type: "application/octet-stream"});
	var palfileName = export_fileName + "_indexes.bin";
	saveAs(palblob, palfileName);
  }



function savePalette(_asText){
	var saveTextFileHere = false;
	var asCper = null;
	var asC = null;
	if (_asText === '@fromeditor') {
		var mode = document.getElementById("paletteMode").value;
		if (mode === "palASM") {
			_asText = ";\tpalette for: " + export_fileName + "\n";
			var d = new Date();
			_asText += ";\t" +  d.toString() + "\n";
			saveTextFileHere = true;
		}
		else _asText = null;
		if ((mode === "palCper") || (mode === "palCper2")) {
			asCper = ";\tcopperlist for: " + export_fileName + "\n";
			var d = new Date();
			asCper += ";\t" +  d.toString() + "\n";
			saveTextFileHere = true;
		}
		if (mode === "palC") {
			asC = "//\tcopperlist for: " + export_fileName + "\n";
			var d = new Date();
			asC += "//\t" +  d.toString() + "\n";
			asC += "unsigned short copperlist[] = {\n";
			saveTextFileHere = true;
		}
		var save2Clipboard = false;
		var mode2 = document.getElementById("paletteSaveTo").value;
		if (mode2 === "pal_clipBoard") {
			if (mode === "paltBin")
				alert("can't save binary palette to clipboard.");
			else
				save2Clipboard = true;
		}
	}

	var data;
	var index;
	var palLen = global_palette.length;
	var startCol = 0;
	var firstCperCol = 0x180;
	if (mode === "palCper2")
		firstCperCol = 0x1a0;

	if (isColor0Locked()) {	
		startCol = 1;
		palLen--;
		if (_asText) {
			_asText += "; first color is locked, so it's not exported in this palette.\n";
		}
		if (asCper !== null) {
			firstCperCol += 2;
			asCper += "; first color is locked, so it's not exported in this palette.\n";
		}
		if (asC !== null) {
			firstCperCol += 2;
			asC += "// first color is locked, so it's not exported in this palette.\n";
		}
	}
	if (document.getElementById('includeCount').checked) {
		if (saveTextFileHere) {
			_asText += "\tdc.w\t" + TwoCharString(palLen) + "\t; colors count\n";
		}
		data = new Uint8Array(palLen * 2 + 2);
		data.fill(0);
		data[0] = 0;
		data[1] = palLen & 255;
		index = 2;
	}
	else {
		data = new Uint8Array(palLen * 2);
		data.fill(0);
		index = 0;
	}
	for (var i = startCol; i < global_palette.length; i++)
	{
		var r = nearest(global_palette[i].r);
		var g = nearest(global_palette[i].g);
		var b = nearest(global_palette[i].b);
		var ar = v(v(r>>4)&15);
		var ab = v(v(b>>4)&15);
			
		data[index++] = v(ar);
		data[index++] = v(ab | g);
		if (_asText) {
			_asText += "\tdc.w\t$"+ TwoCharStringHEX(v(ar)) + TwoCharStringHEX(v(ab | g)) +"\n";
		}
		if (asCper) {
			asCper += "\tdc.w\t$"+ TwoCharStringHEX(firstCperCol>>8) + TwoCharStringHEX(firstCperCol&255) + "," + "$" + TwoCharStringHEX(v(ar)) + TwoCharStringHEX(v(ab | g)) +"\n";
			firstCperCol += 2;
		}
		if (asC) {
			asC += "\t0x"+ TwoCharStringHEX(v(ar)) + TwoCharStringHEX(v(ab | g));
			if (i < global_palette.length - 1 ){
				asC += ",";
			}
			asC += "\n";
			firstCperCol += 2;
		}
	}
	if (_asText) {
		if (saveTextFileHere) {
			if (save2Clipboard) {
				copyStringToClipboard(_asText);
				alert("done copying the palette to the clipboard");
			} else {
				var blob = new Blob([_asText], { type: "text/plain;charset=utf-8" });
				saveAs(blob, export_fileName + "_palette.asm");
			}
			return;		
		}
		return _asText;
	}
	
	if (asCper) {
		if (save2Clipboard) {
			copyStringToClipboard(asCper);
			alert("done copying the copperlist to the clipboard");
		} else {
			var blob = new Blob([asCper], { type: "text/plain;charset=utf-8" });
			saveAs(blob, export_fileName + "_copper.asm");
			}
		return;		
	}

	if (asC) {
		asC += "};\n";
		if (save2Clipboard) {
			copyStringToClipboard(asC);
			alert("done copying the palette to the clipboard");
		} else {
			var blob = new Blob([asC], { type: "text/plain;charset=utf-8" });
			saveAs(blob, export_fileName + "_palette.c");
			}
		return;		
	}

	var blob = new Blob([data], {type: "application/octet-stream"});
	var fileName = export_fileName + "_palette.bin";
	saveAs(blob, fileName);
}


function savePaletteC(_asText){
	var asC = _asText;

	var data;
	var index;
	var palLen = global_palette.length;
	var startCol = 0;

	if (isColor0Locked()) {	
		palLen--;
		startCol = 1;
		asC += "// first color is locked, so it's not exported in this palette.\n";
	}
	data = new Uint8Array(palLen * 2);
	data.fill(0);
	index = 0;
	for (var i = startCol; i < global_palette.length; i++)
	{
		var r = nearest(global_palette[i].r);
		var g = nearest(global_palette[i].g);
		var b = nearest(global_palette[i].b);
		var ar = v(v(r>>4)&15);
		var ab = v(v(b>>4)&15);
			
		data[index++] = v(ar);
		data[index++] = v(ab | g);
		asC += "\t0x"+ TwoCharStringHEX(v(ar)) + TwoCharStringHEX(v(ab | g));
		if (i < global_palette.length - 1 ){
			asC += ",";
		}
		asC += "\n";
	}
	return asC;
}


