class ChessboardArrows {
    constructor(wrapperID) {
        this.wrapper = document.getElementById(wrapperID);
        this.svg = document.getElementById('arrow_layer');
        this.arrows = [];
        this.drawing = false;
        this.startSquare = null;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.wrapper.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.wrapper.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.wrapper.addEventListener('mouseup', (e) => this.onMouseUp(e));
    }
    
    getSquare(x, y) {
        const rect = this.wrapper.getBoundingClientRect();
        const size = rect.width / 8;
        const file = Math.floor((x - rect.left) / size);
        const rank = 7 - Math.floor((y - rect.top) / size);
        if (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
            return String.fromCharCode(97 + file) + (rank + 1);
        }
        return null;
    }
    
    getSquareCenter(square) {
        const squareSize = this.wrapper.offsetWidth / 8;
        const file = square.charCodeAt(0) - 97;
        const rank = parseInt(square[1]) - 1;
        return {
            x: (file + 0.5) * squareSize,
            y: (7 - rank + 0.5) * squareSize
        };
    }
    
    createArrow(from, to, color) {
        const fromCenter = this.getSquareCenter(from);
        const toCenter = this.getSquareCenter(to);
        
        // Calculate arrow properties
        const dx = toCenter.x - fromCenter.x;
        const dy = toCenter.y - fromCenter.y;
        const angle = Math.atan2(dy, dx);
        const length = Math.sqrt(dx * dx + dy * dy);
        const headLength = 20;
        const headWidth = 8;
        
        // Create arrow group
        const arrowGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        
        // Create arrow shaft
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", fromCenter.x);
        line.setAttribute("y1", fromCenter.y);
        line.setAttribute("x2", toCenter.x - (headLength * Math.cos(angle)));
        line.setAttribute("y2", toCenter.y - (headLength * Math.sin(angle)));
        line.setAttribute("stroke", color);
        line.setAttribute("stroke-width", "4");
        
        // Create arrow head
        const head = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const tipX = toCenter.x;
        const tipY = toCenter.y;
        const leftX = tipX - headLength * Math.cos(angle - Math.PI/6);
        const leftY = tipY - headLength * Math.sin(angle - Math.PI/6);
        const rightX = tipX - headLength * Math.cos(angle + Math.PI/6);
        const rightY = tipY - headLength * Math.sin(angle + Math.PI/6);
        
        head.setAttribute("d", `M${tipX},${tipY} L${leftX},${leftY} L${rightX},${rightY} Z`);
        head.setAttribute("fill", color);
        
        arrowGroup.appendChild(line);
        arrowGroup.appendChild(head);
        
        return arrowGroup;
    }
    
    onMouseDown(e) {
        const square = this.getSquare(e.clientX, e.clientY);
        if (square) {
            this.drawing = true;
            this.startSquare = square;
        }
    }
    
    onMouseMove(e) {
        if (this.drawing) {
            const currentSquare = this.getSquare(e.clientX, e.clientY);
            // Clear temporary arrows
            const temp = this.svg.querySelector('.temp-arrow');
            if (temp) temp.remove();
            
            if (currentSquare && currentSquare !== this.startSquare) {
                const arrow = this.createArrow(this.startSquare, currentSquare, 'rgba(255, 170, 0, 0.8)');
                arrow.classList.add('temp-arrow');
                this.svg.appendChild(arrow);
            }
        }
    }
    
    onMouseUp(e) {
        if (this.drawing) {
            const endSquare = this.getSquare(e.clientX, e.clientY);
            // Clear temporary arrows
            const temp = this.svg.querySelector('.temp-arrow');
            if (temp) temp.remove();
            
            if (endSquare && endSquare !== this.startSquare) {
                this.addArrow(this.startSquare, endSquare);
            }
            this.drawing = false;
            this.startSquare = null;
        }
    }
    
    clearArrows() {
        while (this.svg.firstChild) {
            this.svg.removeChild(this.svg.firstChild);
        }
        this.arrows = [];
    }
    
    addArrow(from, to, color = 'rgba(255, 170, 0, 0.8)') {
        const arrow = this.createArrow(from, to, color);
        this.svg.appendChild(arrow);
        this.arrows.push({from, to, color, element: arrow});
    }
}