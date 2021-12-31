MOUSE_X = 0;
MOUSE_Y = 0;

function initMouse() {
    document.onmousemove = function(e) {
        e = e || window.event
        fixPageXY(e);
        MOUSE_X = e.pageX;
        MOUSE_Y = e.pageY;
        onMouseMove(e.pageX, e.pageY);
    }
		
    document.onclick = function(e) {
        e = e || window.event
        fixPageXY(e);
        MOUSE_X = e.pageX;
        MOUSE_Y = e.pageY;
        onMouseClick(e.pageX, e.pageY);
    }

    document.onmousedown = function(e) {
        e = e || window.event
        fixPageXY(e);
        MOUSE_X = e.pageX;
        MOUSE_Y = e.pageY;
        onMouseDown(e.pageX, e.pageY);
    }

    document.onmouseup = function(e) {
        e = e || window.event
        fixPageXY(e);
        MOUSE_X = e.pageX;
        MOUSE_Y = e.pageY;
        onMouseUp(e.pageX, e.pageY);
    }
}
		
		
function fixPageXY(e) {
    if (e.pageX == null && e.clientX != null ) { 
        var body = document.body;
        var html = document.documentElement;

        e.pageX = e.clientX + (engine.html.scrollLeft || body && body.scrollLeft || 0);
        e.pageX -= engine.html.clientLeft || 0;
		
        e.pageY = e.clientY + (engine.html.scrollTop || body && body.scrollTop || 0);
        e.pageY -= engine.html.clientTop || 0;			
    }
}

/*
CURSOR STYLES:
auto        move           no-drop      col-resize
all-scroll  pointer        not-allowed  row-resize
crosshair   progress       e-resize     ne-resize
default     text           n-resize     nw-resize
help        vertical-text  s-resize     se-resize
inherit     wait           w-resize     sw-resize
*/

