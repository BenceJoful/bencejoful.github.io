/*todo: 
 * hover over clue to highlight that clue's ring, and non-shaded cells on the ring.  
 * user setting to show finished clues, or tool to toggle them off individually.
 * Mobile friendly - bigger controls
 * Help section with rules and interface guide, or video?
 * Gallery of puzzles to include.
*/

'use strict';
$(document).ready(function () {

    class Cell {
        hexTypeID = 0;
        number = 0;
        label = "";
        sudokuCellGroups = [];
        x = 0;
        y = 0;
        showRing = true;
        rightTriClueColorID = 1;
        rightTriClueNumber = 0;
        rightTriClueLabel = "";
        leftTriClueColorID = 1;
        leftTriClueNumber = 0;
        leftTriClueLabel = "";
        rightTriClue2ColorID = 1;
        rightTriClue2Number = 0;
        rightTriClue2Label = "";
        leftTriClue2ColorID = 1;
        leftTriClue2Number = 0;
        leftTriClue2Label = "";
        showRightTriRing = true;
        showLeftTriRing = true;
        showRightTri2Ring = true;
        showLeftTri2Ring = true;
        constructor(x, y, hexTypeID, number, sudokuCellGroups, showRing,
            rightTriClueColorID, rightTriClueNumber, rightTriClueLabel,
            leftTriClueColorID, leftTriClueNumber, leftTriClueLabel,
            rightTriClue2ColorID, rightTriClue2Number, rightTriClue2Label,
            leftTriClue2ColorID, leftTriClue2Number, leftTriClue2Label,
            showRightTriRing,
            showLeftTriRing,
            showRightTri2Ring,
            showLeftTri2Ring,
        ) {
            this.x = x;
            this.y = y;
            this.hexTypeID = hexTypeID;
            this.number = number;
            this.sudokuCellGroups = sudokuCellGroups;
            this.showRing = showRing;
            this.rightTriClueColorID = rightTriClueColorID;
            this.rightTriClueNumber = rightTriClueNumber;
            this.rightTriClueLabel = rightTriClueLabel;
            this.leftTriClueColorID = leftTriClueColorID;
            this.leftTriClueNumber = leftTriClueNumber;
            this.leftTriClueLabel = leftTriClueLabel;
            this.rightTriClue2ColorID = rightTriClue2ColorID;
            this.rightTriClue2Number = rightTriClue2Number;
            this.rightTriClue2Label = rightTriClue2Label;
            this.leftTriClue2ColorID = leftTriClue2ColorID;
            this.leftTriClue2Number = leftTriClue2Number;
            this.leftTriClue2Label = leftTriClue2Label;
            this.showRightTriRing = showRightTriRing;
            this.showLeftTriRing = showLeftTriRing;
            this.showRightTri2Ring = showRightTri2Ring;
            this.showLeftTri2Ring = showLeftTri2Ring;

        }
    }
    function getCellClone(cell) {
        return new Cell(cell.x, cell.y, cell.hexTypeID, cell.number, cell.sudokuCellGroups, cell.showRing,
            cell.rightTriClueColorID, cell.rightTriClueNumber, cell.rightTriClueLabel,
            cell.leftTriClueColorID, cell.leftTriClueNumber, cell.leftTriClueLabel,
            cell.rightTriClue2ColorID, cell.rightTriClue2Number, cell.rightTriClue2Label,
            cell.leftTriClue2ColorID, cell.leftTriClue2Number, cell.leftTriClue2Label,
            cell.showRightTriRing, cell.showLeftTriRing, cell.showRightTri2Ring, cell.showLeftTri2Ring
        );
    }

    function getDrawCoords(x, y, overX) {
        if (typeof overX == "undefined") overX = x;
        var drawY = HEX_H * y + canvasDrawingYOff;
        var drawX = HEX_W * x + canvasDrawingXOff;
        if (overX % 2) {
            drawY += HEX_H / 2;
        }
        return [drawX, drawY];
    };

    function getHexCenter(x, y) {
        var drawCoords = getDrawCoords(x, y);
        return [drawCoords[0] + linelen + .5, drawCoords[1] + HEX_H / 2];
    };

    function setPathCoords(x, y, percent) {
        if (percent == undefined) percent = 1;
        ctx.beginPath();
        for (var i = 0; i < 6; i++) {
            ctx.lineTo(x + HEX_PATH[i][0] * percent, Math.round(y + HEX_PATH[i][1] * percent) + .5); // no need to moveTo first, since the initial lineTo is treated as a moveTo.
        }
        ctx.closePath();
    };
    function setPath(x, y) {
        var drawCoords = getDrawCoords(x, y);
        setPathCoords(drawCoords[0], drawCoords[1]);
    };

    function drawBlock(x, y, fillStyle, offsetX, offsetY, strokeStyle) {
        // draw a single hex at (x, y)
        if (x < 0 || y < 0) return;
        if (offsetX === undefined) offsetX = 0;
        if (offsetY === undefined) offsetY = 0;
        var drawCoords = getDrawCoords(x, y);
        drawBlockCoords(drawCoords[0] + offsetX, drawCoords[1] + offsetY, fillStyle, strokeStyle);

        return drawCoords;
    };
    function drawBlockCoords(x, y, fillStyle, strokeStyle) {
        setPathCoords(x, y);
        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }
        if (strokeStyle) {
            ctx.strokeStyle = strokeStyle;
            ctx.stroke();
        }
    }

    function resetBoard() {
        board = [];
        for (var x = 0; x < COLS; ++x) {
            board[x] = [];
            for (var y = 0; y < ROWS; ++y) {
                setBoardHexType([x, y], 0);
            }
        }
        var centerColX = Math.floor(COLS / 2);

        let coordsWest = [centerColX, 0];
        let coordsEast = [centerColX, 0];
        for (var xOff = 0; xOff <= centerColX; ++xOff) {
            let lineLen = coordsWest[0] + centerColX + 1;
            for (var yOff = 0; yOff < lineLen; ++yOff) {
                setBoardHexType([coordsWest[0], coordsWest[1] + yOff], 1);
                setBoardHexType([coordsEast[0], coordsEast[1] + yOff], 1);
            }
            coordsWest = getNeighborHexCoords(coordsWest, 4);//4 for southwest;
            coordsEast = getNeighborHexCoords(coordsEast, 0);//4 for southeast;
        }
        //for (let lineheight = ROWS; lineheight > centerColX - 1; lineheight--) {
        //    //move left and right, drawing down.
        //    for (var y = 0; y < ROWS; ++y) {
        //        setBoardHexType([centerColX, y], 1);
        //    }
        //}

        description = "Untitled";
        $("#hTitle").text(description);
        undoboards = [];
        redoboards = [];
        recalcDrawingOffsets();
        createTools();
    }

    function importBoard() {
        //let boardDef = $("#txtBoardDefinition").val();
        //window.localStorage.setItem("boardDef", boardDef);
        boardDef = boardDef.split("~");
        COLS = JSON.parse(boardDef.shift()) * 2 - 1;
        ROWS = COLS;
        resetBoard();
        description = boardDef.shift();
        $("#hTitle").text(description);
        let ringRadiusList = JSON.parse(boardDef.shift());
        for (var i = 0; i < ringRadiusList.length; i++) {
            hexTypes[i].radius = ringRadiusList[i];
        }
        var lines = boardDef.shift().replace(/\./g, "@").split(";");
        //for each line, get the first 4 characters, convert to integer, put it in board.
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].split("");
            for (var j = 0; j < line.length; j++) {
                if (inBoard(j, i)) {
                    var lineVal = line[j];
                    if (Number.isInteger(Number(lineVal))) {
                        setBoardNumber([j, i], Number(lineVal));
                        line.splice(j, 1);
                        j--;
                    } else {
                        var boardvalue = lineVal.charCodeAt(0) - 64;
                        setBoardHexType([j, i], boardvalue);
                    }
                }
            }
        }
        if (boardDef.length > 0) {
            //get and process triangular clues
            let rightTriangularClues = JSON.parse(boardDef.shift());
            for (let rightTriClue of rightTriangularClues) {
                let cell = board[rightTriClue[0]][rightTriClue[1]];
                cell.rightTriClueColorID = rightTriClue[2];
                cell.rightTriClueNumber = rightTriClue[3];
                cell.rightTriClueLabel = rightTriClue[4];
            }
            let leftTriangularClues = JSON.parse(boardDef.shift());
            for (let leftTriClue of leftTriangularClues) {
                let cell = board[leftTriClue[0]][leftTriClue[1]];
                cell.leftTriClueColorID = leftTriClue[2];
                cell.leftTriClueNumber = leftTriClue[3];
                cell.leftTriClueLabel = leftTriClue[4];
            }
            let rightTriangularClues2 = JSON.parse(boardDef.shift());
            for (let rightTriClue2 of rightTriangularClues2) {
                let cell = board[rightTriClue2[0]][rightTriClue2[1]];
                cell.rightTriClue2ColorID = rightTriClue2[2];
                cell.rightTriClue2Number = rightTriClue2[3];
                cell.rightTriClue2Label = rightTriClue2[4];
            }
            let leftTriangularClues2 = JSON.parse(boardDef.shift());
            for (let leftTriClue2 of leftTriangularClues2) {
                let cell = board[leftTriClue2[0]][leftTriClue2[1]];
                cell.leftTriClue2ColorID = leftTriClue2[2];
                cell.leftTriClue2Number = leftTriClue2[3];
                cell.leftTriClue2Label = leftTriClue2[4];
            }
            let cellLabels = JSON.parse(boardDef.shift());
            for (let cellLabel of cellLabels) {
                let cell = board[cellLabel[0]][cellLabel[1]];
                cell.label = cellLabel[2];
            }
        }
        drawBoard();
    }
    function drawBoard() {
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'black';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        //ctx.fillStyle = "pink";
        //ctx.fillRect(0, 0, canvas.width, canvas.height);

        //clear out mouseovers that were here before.
        for (var i = mouseOverTexts.length - 1; i >= 0; i--) {
            if (mouseOverTexts[i].type != "tool") {
                mouseOverTexts.splice(i, 1);
            }
        }

        var filledBlocks = [];
        var minX = COLS;
        var minY = ROWS;
        var maxX = 0;
        var maxY = 0;
        for (var x = 0; x < board.length; ++x) {
            for (var y = 0; y < board[x].length; ++y) {
                var hexTypeID = board[x][y].hexTypeID;
                if (hexTypeID > 0) {
                    filledBlocks.push([x, y]);
                    if (minX > x) {
                        minX = x;
                    }
                    if (maxX < x) {
                        maxX = x;
                    }
                    if (minY > y) {
                        minY = y;
                    }
                    if (maxY < y) {
                        maxY = y;
                    }
                    //} else {
                    //drawBlock(x, y, hexTypes[hexTypeID].color, null, null, true);
                    //todo: make this a basic hex, not squarish grid
                }
            }
        }

        // stroke the filled blocks with a shadow.
        ctx.shadowBlur = 3;
        ctx.lineWidth = 3;
        for (var i = 0; i < filledBlocks.length; i++) {
            var x = filledBlocks[i][0];
            var y = filledBlocks[i][1];

            //draw block shadow, preparing for real block next.
            drawBlock(x, y, null, null, null, true);
        }
        ctx.shadowBlur = 0;
        let clueCells = [];
        for (var i = 0; i < filledBlocks.length; i++) {
            var x = filledBlocks[i][0];
            var y = filledBlocks[i][1];
            var cell = board[x][y];

            if (cell.hexTypeID > 3 && cell.number) {
                //draw these later so they aren't obscured by rings
                clueCells.push(cell);
            } else if (cell.hexTypeID > 3) {
                //Draw pencil marks - clues without numbers, used during solving process.
                let centerCoords = getHexCenter(cell.x, cell.y);
                //let grad = ctx.createRadialGradient(centerCoords[0], centerCoords[1], 0, centerCoords[0], centerCoords[1], 12);
                //grad.addColorStop(.5, hexTypes[cell.hexTypeID].color);
                //grad.addColorStop(.75, "white");
                drawBlock(cell.x, cell.y, "white");
                ctx.beginPath();
                ctx.fillStyle = hexTypes[cell.hexTypeID].color;
                ctx.arc(centerCoords[0], centerCoords[1], 10, 0, 2 * Math.PI);
                ctx.fill();

                //todo: connect with adjacent pencil marks of same color.
                for (let neighborCoords of getAllNeighborHexCoords([x, y])) {
                    let ncell = getBoardCell(neighborCoords);
                    if (ncell && ncell.hexTypeID == cell.hexTypeID && !ncell.number) {
                        //draw line connecting them.
                        ctx.strokeStyle = hexTypes[cell.hexTypeID].color;
                        ctx.lineWidth = 20;
                        ctx.beginPath();
                        ctx.moveTo(centerCoords[0], centerCoords[1]);
                        let ncenterCoords = getHexCenter(ncell.x, ncell.y);
                        ctx.lineTo(ncenterCoords[0], ncenterCoords[1]);
                        ctx.stroke();
                    }
                }
            } else {
                drawBlock(x, y, hexTypes[cell.hexTypeID].color);
            }
        }
        //reset drawing context
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'black';

        //draw rings
        //get all cells of that radius and draw rings around them.
        //handle the line segments individually between cells, so we can do striping.
        let ringLines = {};
        for (let x = 0; x < COLS; ++x) {
            for (let y = 0; y < ROWS; ++y) {
                let cell = getBoardCell([x, y]);
                if (cell) {
                    let coordsLists = [];
                    if (cell.hexTypeID > 3 && cell.number) {
                        let hexType = hexTypes[cell.hexTypeID];
                        if (hexType.radius) {
                            coordsLists.push([(cell.showRing ? "" : "_") + hexType.color, getCellRingCoords(cell, hexType.radius)]);
                        }
                    }
                    if (cell.leftTriClueColorID > 3 && cell.leftTriClueNumber) {
                        //get triangle around this point.  side lengths are 2, 3, 5, 6, 8, 9, 11, 12, 14, 15.  side length = Radius + 1.
                        //when inserting into ringlines, make sure all coordinates are left to right, top to bottom.
                        let hexType = hexTypes[cell.leftTriClueColorID];
                        if (hexType.radius) {
                            coordsLists.push([(cell.showLeftTriRing ? "" : "_") + hexType.color, getCellTriCoords(cell, hexType.radius, true)]);
                        }
                    }
                    if (cell.rightTriClueColorID > 3 && cell.rightTriClueNumber) {
                        //get triangle around this point.  side lengths are 2, 3, 5, 6, 8, 9, 11, 12, 14, 15.  side length = Radius + 1.
                        //when inserting into ringlines, make sure all coordinates are left to right, top to bottom.
                        let hexType = hexTypes[cell.rightTriClueColorID];
                        if (hexType.radius) {
                            coordsLists.push([(cell.showRightTriRing ? "" : "_") + hexType.color, getCellTriCoords(cell, hexType.radius, false)]);
                        }
                    }
                    if (cell.leftTriClue2ColorID > 3 && cell.leftTriClue2Number) {
                        //get triangle around this point.  side lengths are 2, 3, 5, 6, 8, 9, 11, 12, 14, 15.  side length = Radius + 1.
                        //when inserting into ringlines, make sure all coordinates are left to right, top to bottom.
                        let hexType = hexTypes[cell.leftTriClue2ColorID];
                        if (hexType.radius) {
                            coordsLists.push([(cell.showLeftTri2Ring ? "" : "_") + hexType.color, getCellTriCoords(cell, hexType.radius, true, true)]);
                        }
                    }
                    if (cell.rightTriClue2ColorID > 3 && cell.rightTriClue2Number) {
                        //get triangle around this point.  side lengths are 2, 3, 5, 6, 8, 9, 11, 12, 14, 15.  side length = Radius + 1.
                        //when inserting into ringlines, make sure all coordinates are left to right, top to bottom.
                        let hexType = hexTypes[cell.rightTriClue2ColorID];
                        if (hexType.radius) {
                            coordsLists.push([(cell.showRightTri2Ring ? "" : "_") + hexType.color, getCellTriCoords(cell, hexType.radius, false, true)]);
                        }
                    }
                    for (let coordsList of coordsLists) {
                        let ringColor = coordsList[0];
                        coordsList = coordsList[1];
                        if (coordsList) {
                            let ringLine = {
                                x1: coordsList[coordsList.length - 1][0],
                                y1: coordsList[coordsList.length - 1][1],
                            };
                            for (var ringCoords of coordsList) {
                                if (ringLine.x1 < ringCoords[0] || (ringLine.x1 == ringCoords[0] && ringLine.y1 < ringCoords[1])) {
                                    ringLine.x2 = ringCoords[0];
                                    ringLine.y2 = ringCoords[1];
                                } else {
                                    ringLine.x2 = ringLine.x1;
                                    ringLine.y2 = ringLine.y1;
                                    ringLine.x1 = ringCoords[0];
                                    ringLine.y1 = ringCoords[1];
                                }
                                ringLine = JSON.stringify(ringLine);
                                if (ringLines[ringLine]) {
                                    ringLines[ringLine].push(ringColor);
                                } else {
                                    ringLines[ringLine] = [ringColor];
                                }
                                ringLine = {
                                    x1: ringCoords[0],
                                    y1: ringCoords[1],
                                };
                            }
                        }
                    }
                }
            }
        }

        //so, ringLines will be a dictionary of encodedCoords, List<color> which allows duplicates.
        const segmentCount = 8;
        ctx.lineWidth = 6;
        for (let ringLine in ringLines) {
            let colors = ringLines[ringLine];
            ringLine = JSON.parse(ringLine);
            [ringLine.x1, ringLine.y1] = getHexCenter(ringLine.x1, ringLine.y1);
            [ringLine.x2, ringLine.y2] = getHexCenter(ringLine.x2, ringLine.y2);

            ctx.beginPath();
            ctx.fillStyle = colors[0];
            ctx.fill();

            if (colors.length == 1) {
                if (colors[0][0] == "_") {
                    ctx.globalAlpha = 0.5;
                    colors[0] = colors[0].substr(1, 900);
                } else if (ctx.globalAlpha == 0.5) {
                    ctx.globalAlpha = 1;
                }
                ctx.strokeStyle = colors[0];
                ctx.beginPath();
                ctx.moveTo(ringLine.x1, ringLine.y1);
                ctx.lineTo(ringLine.x2, ringLine.y2);
                ctx.stroke();

            } else {
                //if there are multiple colors, split the line into 4 segments of length ctx.linewidth and draw accordingly.
                let ratio = 0;
                for (var segmentI = 0; segmentI < segmentCount; segmentI++) {
                    let c = colors[segmentI % colors.length];
                    if (c[0] == "_") {
                        ctx.globalAlpha = 1;
                        c = c.substr(1, 900);
                    } else if (ctx.globalAlpha == 0.5) {
                        ctx.globalAlpha = 1;
                    }
                    ctx.strokeStyle = c;
                    ctx.beginPath();
                    ctx.moveTo(ringLine.x1 * ratio + ringLine.x2 * (1 - ratio), Math.round(ringLine.y1 * ratio + ringLine.y2 * (1 - ratio)));
                    ratio += 1 / segmentCount;
                    ctx.lineTo(ringLine.x1 * ratio + ringLine.x2 * (1 - ratio), Math.round(ringLine.y1 * ratio + ringLine.y2 * (1 - ratio)));
                    ctx.stroke();
                }
            }
        }
        ctx.globalAlpha = 1;
        ctx.lineWidth = 3;

        //Draw clues now, so they aren't obscured by rings 
        for (let cell of clueCells) {
            let hexType = hexTypes[cell.hexTypeID];
            let coords = drawBlock(cell.x, cell.y, hexType.color, null, null, "black");
            //draw number
            let s = (cell.number % 7).toString();
            if (cell.label != "") {
                s = cell.label;
            }
            ctx.font = (linelen * (2 - s.length + 3) / 4) + 'px sans-serif';
            drawString(s, Math.round(coords[0] + HEX_W / 2) - (s.length - 1) * linelen / 6, Math.round(coords[1] + HEX_H / 2 + linelen / 3), "black");

            if (showClueLetters) {
                //draw colorblind-friendly letter.
                ctx.font = linelen / 2 + 'px sans-serif';
                drawString(hexType.symbol, Math.round(coords[0] + HEX_W / 2 - linelen / 2), Math.round(coords[1] + HEX_H / 2 + linelen / 6), "black");
            }
        }
        ctx.font = '20px sans-serif';

        ctx.lineWidth = 1;

        drawToolbox();

    }

    function getBoardDef() {
        //display board text further down in the webpage.
        let lines = [];
        let boardWidth = 0;
        let boardHeight = 0;
        let rightTriangularClues = [];
        let leftTriangularClues = [];
        let rightTriangularClues2 = [];
        let leftTriangularClues2 = [];
        let cellLabels = [];
        for (let y = 0; y < board[0].length; ++y) {
            var line = "";
            var lineBuffer = "";
            for (let x = 0; x < board.length; ++x) {
                let cell = board[x][y];
                var boardValue = String.fromCharCode(64 + cell.hexTypeID);
                if (cell.hexTypeID > 0) {
                    if (cell.number > 0) {
                        lineBuffer += cell.number.toString();
                        if (cell.label != "") {
                            cellLabels.push([x, y, cell.label]);
                        }
                    }
                }
                lineBuffer += boardValue;
                if (cell.hexTypeID > 0) {
                    if (x > boardWidth) {
                        boardWidth = x;
                    }
                    if (y > boardHeight) {
                        boardHeight = y;
                    }
                    line += lineBuffer;
                    lineBuffer = "";
                }
                if (cell.rightTriClueColorID > 1 && cell.rightTriClueNumber > 0) {
                    rightTriangularClues.push([cell.x, cell.y, cell.rightTriClueColorID, cell.rightTriClueNumber, cell.rightTriClueLabel]);
                }
                if (cell.leftTriClueColorID > 1 && cell.leftTriClueNumber > 0) {
                    leftTriangularClues.push([cell.x, cell.y, cell.leftTriClueColorID, cell.leftTriClueNumber, cell.leftTriClueLabel]);
                }
                if (cell.rightTriClue2ColorID > 1 && cell.rightTriClue2Number > 0) {
                    rightTriangularClues2.push([cell.x, cell.y, cell.rightTriClue2ColorID, cell.rightTriClue2Number, cell.rightTriClue2Label]);
                }
                if (cell.leftTriClue2ColorID > 1 && cell.leftTriClue2Number > 0) {
                    leftTriangularClues2.push([cell.x, cell.y, cell.leftTriClue2ColorID, cell.leftTriClue2Number, cell.leftTriClue2Label]);
                }
            }
            lines.push(line || "@");
        }
        lines.length = boardHeight + 1;

        let ringRadiusList = [];
        for (var i = 0; i < hexTypes.length; i++) {
            ringRadiusList[i] = hexTypes[i].radius || 0;
        };
        var boardDef = Math.ceil(COLS / 2) + "~" + description + "~" + JSON.stringify(ringRadiusList) + "~" + lines.join(";").replace(/@/g, ".") + "~" + JSON.stringify(rightTriangularClues) + "~" + JSON.stringify(leftTriangularClues) + "~" + JSON.stringify(rightTriangularClues2) + "~" + JSON.stringify(leftTriangularClues2) + "~" + JSON.stringify(cellLabels);
        return boardDef;

        //$("#txtBoardDefinition").val(boardDef);
        //window.localStorage.setItem("boardDef", boardDef);
    }

    function drawToolbox() {
        for (var i = 0; i < tools.length; i++) {
            var tool = tools[i];
            if (tool.color != "") {
                ctx.fillStyle = tool.color;
                ctx.fillRect(tool.x, tool.y, tool.width, tool.height);
                ctx.strokeStyle = "black";
                ctx.strokeRect(tool.x, tool.y, tool.width, tool.height);
            }
            if (typeof tool.draw === "string") {
                drawString(tool.draw, tool.x + tool.width / 2 - 6.5, tool.y + 21, "black");
            } else if (tool.draw) {
                tool.draw();
            }
        }
    }

    function drawToolShadow(tool) {
        //draw shadow and re-fill.
        ctx.shadowBlur = 3;
        ctx.lineWidth = 3;
        ctx.strokeRect(tool.x, tool.y, tool.width, tool.height);
        ctx.fillRect(tool.x, tool.y, tool.width, tool.height);
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1;
    }

    function getToolsAtCoords(mouseX, mouseY) {
        let rTools = [];
        for (var i = 0; i < tools.length; i++) {
            var tool = tools[i];
            if (tool.x <= mouseX && mouseX <= tool.x + tool.width && tool.y <= mouseY && mouseY <= tool.y + tool.height) {
                rTools.push(tool);
            }
        }
        return rTools;
    }
    function addMouseOverText(text, type, left, top, right, bottom) {
        if (!Array.isArray(text)) {
            text = [text];
        }
        mouseOverTexts.push({
            text: text,
            type: type,
            left: left,
            top: top,
            right: right,
            bottom: bottom,
        });
    }
    function getMouseOverTextAtCoords(mouseX, mouseY) {
        for (var i = mouseOverTexts.length - 1; i >= 0; i--) {
            var mouseOverText = mouseOverTexts[i];
            if (mouseOverText.left <= mouseX && mouseX <= mouseOverText.right && mouseOverText.top <= mouseY && mouseY <= mouseOverText.bottom) {
                if (Array.isArray(mouseOverText.text)) {
                    return mouseOverText.text;
                } else {
                    return mouseOverText.text();
                }
            }
        }
    }
    var isMouseDown = false;
    var mouseMovingColor = 0;
    var showingMouseOver = false;
    function handleMouse(e) {
        e.preventDefault();
        e.stopPropagation();

        let eventType = "";
        let canvasOffset = $canvas.offset();
        let mouseX = - canvasOffset.left;
        let mouseY = -canvasOffset.top;

        if (e.touches && e.touches[0]) {
            mouseX += e.touches[0].pageX;
            mouseY += e.touches[0].pageY;
        } else {
            mouseX += e.pageX;
            mouseY += e.pageY;
        }

        switch (e.type.substr(5)) {
            case "down":
            case "start":
                eventType = "down";
                break;
            case "move":
                eventType = "move";
                break;
            case "up":
            case "end":
                eventType = "up";
                break;
        }

        if (eventType == "move") {
            var prevHexCoords = getMouseHexCoords(prevMouseX, prevMouseY);
            var hexCoords = getMouseHexCoords(mouseX, mouseY);
            if (prevHexCoords[0] != hexCoords[0] || prevHexCoords[1] != hexCoords[1]) {
                usePencil(mouseX, mouseY, e.shiftKey, e.ctrlKey);
            }
            if (showingMouseOver) {
                showingMouseOver = false;
                drawBoard();
            }
            var mouseOverText = getMouseOverTextAtCoords(mouseX, mouseY);
            if (mouseOverText && mouseOverText[0]) {
                while (mouseOverText[mouseOverText.length - 1] == "") {
                    //clear empties off end.
                    mouseOverText.pop();
                }
                ctx.font = '20px sans-serif';
                let mtX = 288;
                let mtY = 23;
                ctx.clearRect(mtX - 5, mtY - 23, canvasW - mtX, 30 * mouseOverText.length);
                for (let textLine of mouseOverText) {
                    drawString(textLine, mtX, mtY, "black", "white");
                    mtY += 20;
                }
                //drawString(mouseOverText, mouseX, mouseY + 20, "black", "white");
                showingMouseOver = true;
            }

        } else if (eventType == "down") {
            var handled = false;
            //check tools first
            let rTools = getToolsAtCoords(mouseX, mouseY);
            while (rTools.length) {
                let tool = rTools.shift();
                handled = tool.click(e.ctrlKey, e.shiftKey);
                if (handled) {
                    break;
                }
            }
            if (!handled) {
                //check board
                isMouseDown = true;
                var boardJSON = getBoardJSON();
                mouseMovingColor = 0;
                if (usePencil(mouseX, mouseY, e.shiftKey, e.ctrlKey)) {
                    registerBoardChange(boardJSON);
                }
            }
        } else if (eventType == "up") {
            isMouseDown = false;
            mouseMovingColor = 0;
            prevMouseX = null;
            prevMouseY = null;
        }
    }
    function getBoardJSON() {
        return JSON.stringify({ "desc": description, "board": board, "hexTypes": hexTypes });
    }
    function registerBoardChange(boardJSON) {
        undoboards.push(boardJSON || getBoardJSON());
        redoboards = [];
    }
    function undoBoardChange(numTimes) {
        numTimes = numTimes || 1;
        if (undoboards.length > 0 && undoboards.length < numTimes) {
            numTimes = undoboards.length;
        }
        if (undoboards.length >= numTimes) {
            redoboards.push(getBoardJSON());
            for (var i = 0; i < numTimes - 1; i++) {
                redoboards.push(undoboards.pop());
            }
            doBoardChange(undoboards.pop());
        }
    }

    function redoBoardChange(numTimes) {
        numTimes = numTimes || 1;
        if (redoboards.length > 0 && redoboards.length < numTimes) {
            numTimes = redoboards.length;
        }

        if (redoboards.length) {
            undoboards.push(getBoardJSON());
            for (var i = 0; i < numTimes - 1; i++) {
                undoboards.push(redoboards.pop());
            }
            doBoardChange(redoboards.pop());
        }
    }
    function doBoardChange(boardJSON) {
        var b = JSON.parse(boardJSON);
        board = b.board;
        description = b.desc;
        $("#hTitle").text(description);
        hexTypes = b.hexTypes;
        //rewire any tools that have cells attached to the new ones.
        createTools();
    }

    function toolClickAutoUnshade() {
        //from each shaded cell, shade off all None cells on all axes.
        for (var x = 0; x < COLS; ++x) {
            for (var y = 0; y < ROWS; ++y) {
                let cell = getBoardCell([x, y]);
                if (cell && cell.hexTypeID == 3) {
                    for (let dir = 0; dir < 6; dir++) {
                        let neighborCellCoords = [cell.x, cell.y];
                        let neighborCell = cell;
                        while (neighborCell) {
                            neighborCellCoords = getNeighborHexCoords(neighborCellCoords, dir);
                            neighborCell = getBoardCell(neighborCellCoords);
                            if (neighborCell) {
                                if (neighborCell.hexTypeID == 1 || (neighborCell.hexTypeID > 3 && !neighborCell.number)) {
                                    setBoardHexType(neighborCellCoords, 2);
                                }
                            } else {
                                break;
                            }
                        }
                    }
                }
            }
        }

        if (!solveMode) {
            //check if it's broken.  For each line, check if all shaded.  If so, alert.  If one is unshaded, shade and go again.
            for (let cellGroup of getColCellGroups(board)) {
                let allShaded = true;
                let openCellCoords = [-1, -1];
                for (let cell of cellGroup) {
                    if (cell.hexTypeID == 1 || (cell.hexTypeID > 3 && !cell.number)) {
                        if (allShaded) {
                            //found first open cell
                            openCellCoords = [cell.x, cell.y];
                        } else {
                            //found second+ open cell
                            openCellCoords = [-1, -1];
                        }
                        allShaded = false;
                    }
                    if (cell.hexTypeID == 3)//shaded
                    {
                        openCellCoords = [-1, -1];
                        allShaded = false;
                        break;
                    }
                }
                if (allShaded) {
                    console.log("Warning " + Date.now() + ": no shaded cells in line containing [" + cellGroup[0].x + "," + cellGroup[0].y + "]");
                    autoUnshade = false;
                    return false;
                } else if (openCellCoords[0] > -1) {
                    //set as shaded, then go again.
                    setBoardHexType(openCellCoords, 3);
                }
            }
        }
        return true;
    }

    function getMaxRadius(hexTypeID) {
        var maxRadius = Math.floor(COLS / 2);
        for (let y = 0; y < ROWS; ++y) {
            for (let x = 0; x < COLS; ++x) {
                let cell = getBoardCell([x, y]);
                if (cell) {
                    if (cell.hexTypeID == hexTypeID && cell.number) {
                        //travel in all directions until finding a space without a cell.
                        for (let dir = 0; dir < 6; dir++) {
                            let neighborCoords = [x, y];
                            for (let radius = 1; radius <= maxRadius; radius++) {
                                neighborCoords = getNeighborHexCoords(neighborCoords, dir);
                                let neighborcell = getBoardCell(neighborCoords);
                                if (!neighborcell || neighborcell.hexTypeID == 0) {
                                    maxRadius = radius - 1;
                                    break;
                                }
                            }
                            if (maxRadius == 1) {
                                break;
                            }
                        }
                    }
                    //check triangular clues
                    if (cell.leftTriClueColorID == hexTypeID && cell.leftTriClueNumber) {
                        //grow until it doesn't work anymore.
                        for (let radius = 1; radius <= maxRadius; radius++) {
                            let triCoordsList = getCellTriCoords(cell, radius, true);
                            for (let triCoords of triCoordsList) {
                                let triCell = getBoardCell(triCoords);
                                if (!triCell || triCell.hexTypeID == 0) {
                                    maxRadius = radius - 1;
                                    break;
                                }
                            }
                        }
                    }
                    if (cell.rightTriClueColorID == hexTypeID && cell.rightTriClueNumber) {
                        //grow until it doesn't work anymore.
                        for (let radius = 1; radius <= maxRadius; radius++) {
                            let triCoordsList = getCellTriCoords(cell, radius, false);
                            for (let triCoords of triCoordsList) {
                                let triCell = getBoardCell(triCoords);
                                if (!triCell || triCell.hexTypeID == 0) {
                                    maxRadius = radius - 1;
                                    break;
                                }
                            }
                        }
                    }
                    //check triangular clues
                    if (cell.leftTriClue2ColorID == hexTypeID && cell.leftTriClue2Number) {
                        //grow until it doesn't work anymore.
                        for (let radius = 1; radius <= maxRadius; radius++) {
                            let triCoordsList = getCellTriCoords(cell, radius, true, true);
                            for (let triCoords of triCoordsList) {
                                let triCell = getBoardCell(triCoords);
                                if (!triCell || triCell.hexTypeID == 0) {
                                    maxRadius = radius - 1;
                                    break;
                                }
                            }
                        }
                    }
                    if (cell.rightTriClue2ColorID == hexTypeID && cell.rightTriClue2Number) {
                        //grow until it doesn't work anymore.
                        for (let radius = 1; radius <= maxRadius; radius++) {
                            let triCoordsList = getCellTriCoords(cell, radius, false, true);
                            for (let triCoords of triCoordsList) {
                                let triCell = getBoardCell(triCoords);
                                if (!triCell || triCell.hexTypeID == 0) {
                                    maxRadius = radius - 1;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
        return maxRadius;
    }

    let lastRadiusChangedTime = 0;
    var prevMouseX = null;
    var prevMouseY = null;
    function usePencil(mouseX, mouseY, shiftKey, ctrlKey) {
        var changed = false;
        if (isMouseDown) {
            var hexTypeID = currentHexType;
            if (shiftKey) {
                hexTypeID = 0;
            } else if (solveMode || currentHexType == -1) {
                //solve tool or a colored pencil marker: get current hex to determine proper action.

                var hexCoords = getMouseHexCoords(mouseX, mouseY);
                if (inBoard(hexCoords[0], hexCoords[1])) {
                    let targetcell = board[hexCoords[0]][hexCoords[1]];
                    let targetHexTypeID = targetcell.hexTypeID;
                    if (targetHexTypeID > 3 && targetcell.number) {
                        if (settingLabel) {
                            targetcell.label = settingLabelLabel;
                            settingLabel = false;
                            drawBoard();
                            return true;
                        }
                        let currentTime = Date.now();
                        if (currentTime > lastRadiusChangedTime + 100) {
                            lastRadiusChangedTime = currentTime;
                            //found a clue, increase the ring size.
                            //get max radius by finding closest wall from any hex with this color.
                            let maxRadius = getMaxRadius(targetHexTypeID);

                            registerBoardChange();
                            changed = true;
                            if (event.buttons == 2) {
                                if (hexTypes[targetHexTypeID].radius > 0) {
                                    hexTypes[targetHexTypeID].radius--;
                                } else {
                                    hexTypes[targetHexTypeID].radius = maxRadius;
                                }
                            } else {
                                if (hexTypes[targetHexTypeID].radius < maxRadius) {
                                    hexTypes[targetHexTypeID].radius++;
                                } else {
                                    hexTypes[targetHexTypeID].radius = 0;
                                }
                            }
                        }
                        hexTypeID = 0;
                    } else if (currentHexType == -1) {
                        if (mouseMovingColor == 0) {
                            if (targetHexTypeID == 1 || targetHexTypeID > 3) {
                                if (event.buttons == 2) {
                                    //None, set to Unshaded
                                    hexTypeID = 2;
                                } else {
                                    //None, set to Shaded
                                    hexTypeID = 3;
                                }
                            } else if (targetHexTypeID == 2) {
                                if (event.buttons == 2) {
                                    //Unshaded, set to Shaded
                                    hexTypeID = 3;
                                } else {
                                    //Unshaded, set to None
                                    hexTypeID = 1;
                                }
                            } else if (targetHexTypeID == 3) {
                                if (event.buttons == 2) {
                                    //Shaded, set to None
                                    hexTypeID = 1;
                                } else {
                                    //Shaded, set to Unshaded
                                    hexTypeID = 2;
                                }
                            } else {
                                hexTypeID = 1;
                            }
                        } else {
                            hexTypeID = mouseMovingColor;
                        }
                    }
                } else {
                    hexTypeID = 0;
                }
            }
            if (hexTypeID != 0) {
                mouseMovingColor = hexTypeID;
                //move from mouseX, mouseY toward prevMouseX, prevMouseY, filling in as we go.  Every X pixels, where X is based on hex diameter
                var stepCount = 1;
                if (prevMouseX != null && prevMouseY != null) {
                    //get distance between points.  divide by hex diameter, and this gives us the number of steps to use.
                    var dist = Math.sqrt((mouseX - prevMouseX) * (mouseX - prevMouseX) + (mouseY - prevMouseY) * (mouseY - prevMouseY));
                    stepCount = Math.ceil(dist / linelen);
                } else {
                    prevMouseX = mouseX;
                    prevMouseY = mouseY;
                }
                //for each step, calculate a point by mixing the new mouse location with the old location by a percentage, based on the step number.
                for (var i = 0; i < stepCount; i++) {
                    var pct = i / stepCount;
                    var hexCoords = getMouseHexCoords(prevMouseX * pct + mouseX * (1 - pct), prevMouseY * pct + mouseY * (1 - pct));
                    var x = hexCoords[0];
                    var y = hexCoords[1];
                    if (x >= 0 && y >= 0) {
                        //only allow changing number, not creating new cell
                        let cell = getBoardCell([x, y]);
                        if (cell && cell.hexTypeID > 0) {

                            if (settingLabel && cell.hexTypeID > 3 && cell.number) {
                                cell.label = settingLabelLabel;
                                settingLabel = false;
                                drawBoard();
                            } else {
                                var hexType = hexTypes[hexTypeID];
                                if (hexType.color == "Plum") {//the numbers.
                                    setBoardNumber([x, y], (hexType.symbol == "0" ? 7 : Number(hexType.symbol)))
                                }
                                else {
                                    //for clues
                                    if (cell.hexTypeID > 3 && cell.number) {
                                        if (!solveMode) {
                                            //toggle colors on/off if it's the same clue color.
                                            if (cell.hexTypeID == hexTypeID) {
                                                hexTypeID = 1;
                                            }
                                            //double-check its not the solve tool.  Workaround for issue I should debug.
                                            if (currentHexType != -1) {
                                                setBoardHexType([x, y], hexTypeID);
                                            }
                                        }
                                    } else {
                                        autoUnshade = true;
                                        cell.number = 0;
                                        if (hexTypeID > 3 && hexTypeID == cell.hexTypeID) {
                                            hexTypeID = 1;
                                        }
                                        setBoardHexType([x, y], hexTypeID);
                                    }
                                }
                            }
                            changed = true;
                        }
                    }
                }

                prevMouseX = mouseX;
                prevMouseY = mouseY;
            }
        }
        if (changed) {
            checkAnswer();
            drawBoard();
        }
        return changed;
    }
    function checkAnswer() {
        //check shaded cells, ensure there are correct number and they don't see each other

        let answerValid = true;
        let shadedCellCount = 0;
        //check clues, ensure there are correct number of shaded cells on ring.
        //todo:hide ring on clues that are fulfilled.
        for (let y = 0; y < ROWS; ++y) {
            for (let x = 0; x < COLS; ++x) {
                let cell = getBoardCell([x, y]);
                if (cell) {
                    if (answerValid && cell.hexTypeID == 3) {
                        //found a shaded cell: increment count and check that it sees no other shaded cells
                        shadedCellCount++;
                        if (!cell.sudokuCellGroups) (setSudokuCellGroups());

                        for (let group of cell.sudokuCellGroups) {
                            for (let coords of group.cellCoords) {
                                if (board[coords[0]][coords[1]].hexTypeID == 3) {
                                    answerValid = false;
                                    break;
                                }
                            }
                            if (!answerValid) {
                                break;
                            }
                        }
                    }
                    if (cell.hexTypeID > 3 && cell.number) {
                        //found a clue.  Determine whether it has exactly cell.number shaded cells on perimeter.

                        let hexType = hexTypes[cell.hexTypeID];
                        if (hexType.radius) {
                            let clueShadedCellCnt = 0;
                            let allCellsShaded = true;
                            for (var cellCoords of getCellRingCoords(cell, hexType.radius)) {
                                let ringCell = getBoardCell(cellCoords);
                                if (ringCell) {

                                    if (ringCell.hexTypeID == 3) {
                                        clueShadedCellCnt++;
                                    } else if (ringCell.hexTypeID == 1) {
                                        allCellsShaded = false;
                                    }
                                }
                            }
                            if (cell.number % 7 != clueShadedCellCnt) {
                                answerValid = false;
                                cell.showRing = true;
                            } else if (allCellsShaded && cell.label == "") {
                                //hide this ring.
                                cell.showRing = false;
                            }
                        } else {
                            answerValid = false;
                        }

                    }
                    if (cell.leftTriClueColorID > 1 && cell.leftTriClueNumber) {
                        let hexType = hexTypes[cell.leftTriClueColorID];
                        if (hexType.radius) {
                            let clueShadedCellCnt = 0;
                            let allCellsShaded = true;
                            for (var cellCoords of getCellTriCoords(cell, hexType.radius, true, false)) {
                                let ringCell = getBoardCell(cellCoords);
                                if (ringCell) {
                                    if (ringCell.hexTypeID == 3) {
                                        clueShadedCellCnt++;
                                    } else if (ringCell.hexTypeID == 1) {
                                        allCellsShaded = false;
                                    }
                                }
                            }
                            if (cell.leftTriClueNumber % 7 != clueShadedCellCnt) {
                                answerValid = false;
                                cell.showLeftTriRing = true;
                            } else if (allCellsShaded && cell.leftTriClueLabel == "") {
                                //hide this ring.
                                cell.showLeftTriRing = false;
                            }
                        } else {
                            answerValid = false;
                        }
                    }
                    if (cell.rightTriClueColorID > 1 && cell.rightTriClueNumber) {
                        let hexType = hexTypes[cell.rightTriClueColorID];
                        if (hexType.radius) {
                            let clueShadedCellCnt = 0;
                            let allCellsShaded = true;
                            for (var cellCoords of getCellTriCoords(cell, hexType.radius, false, false)) {
                                let ringCell = getBoardCell(cellCoords);
                                if (ringCell) {
                                    if (ringCell.hexTypeID == 3) {
                                        clueShadedCellCnt++;
                                    } else if (ringCell.hexTypeID == 1) {
                                        allCellsShaded = false;
                                    }
                                }
                            }
                            if (cell.rightTriClueNumber % 7 != clueShadedCellCnt) {
                                answerValid = false;
                                cell.showRightTriRing = true;
                            } else if (allCellsShaded && cell.rightTriClueLabel == "") {
                                //hide this ring.
                                cell.showRightTriRing = false;
                            }
                        } else {
                            answerValid = false;
                        }
                    }
                    if (cell.leftTriClue2ColorID > 1 && cell.leftTriClue2Number) {
                        let hexType = hexTypes[cell.leftTriClue2ColorID];
                        if (hexType.radius) {
                            let clueShadedCellCnt = 0;
                            let allCellsShaded = true;
                            for (var cellCoords of getCellTriCoords(cell, hexType.radius, true, true)) {
                                let ringCell = getBoardCell(cellCoords);
                                if (ringCell) {
                                    if (ringCell.hexTypeID == 3) {
                                        clueShadedCellCnt++;
                                    } else if (ringCell.hexTypeID == 1) {
                                        allCellsShaded = false;
                                    }
                                }
                            }
                            if (cell.leftTriClue2Number % 7 != clueShadedCellCnt) {
                                answerValid = false;
                                cell.showLeftTri2Ring = true;
                            } else if (allCellsShaded && cell.leftTriClue2Label == "") {
                                //hide this ring.
                                cell.showLeftTri2Ring = false;
                            }
                        } else {
                            answerValid = false;
                        }
                    }
                    if (cell.rightTriClue2ColorID > 1 && cell.rightTriClue2Number) {
                        let hexType = hexTypes[cell.rightTriClue2ColorID];
                        if (hexType.radius) {
                            let clueShadedCellCnt = 0;
                            let allCellsShaded = true;
                            for (var cellCoords of getCellTriCoords(cell, hexType.radius, false, true)) {
                                let ringCell = getBoardCell(cellCoords);
                                if (ringCell) {
                                    if (ringCell.hexTypeID == 3) {
                                        clueShadedCellCnt++;
                                    } else if (ringCell.hexTypeID == 1) {
                                        allCellsShaded = false;
                                    }
                                }
                            }
                            if (cell.rightTriClue2Number % 7 != clueShadedCellCnt) {
                                answerValid = false;
                                cell.showRightTri2Ring = true;
                            } else if (allCellsShaded && cell.rightTriClue2Label == "") {
                                //hide this ring.
                                cell.showRightTri2Ring = false;
                            }
                        } else {
                            answerValid = false;
                        }
                    }
                    ////travel in all directions until finding a space without a cell.
                    //for (let dir = 0; dir < 6; dir++) {
                    //    let neighborCoords = [x, y];
                    //    for (let radius = 1; radius <= maxRadius; radius++) {
                    //        neighborCoords = getNeighborHexCoords(neighborCoords, dir);
                    //        let neighborcell = getBoardCell(neighborCoords);
                    //        if (!neighborcell || neighborcell.hexTypeID == 0) {
                    //            maxRadius = radius - 1;
                    //            break;
                    //        }
                    //    }
                    //    if (maxRadius == 1) {
                    //        break;
                    //    }
                    //}
                }
            }
        }
        if (answerValid && shadedCellCount == COLS) {
            isMouseDown = false;
            setTimeout(function () { alert("Congratulations, you solved the puzzle!") }, 1);
        }

    }
    function getCellRingCoords(cell, radius) {
        let coordsList = [];

        //start at southwest corner.
        let ringCoords = [cell.x, cell.y];
        for (let radiusI = 0; radiusI < radius; radiusI++) {
            ringCoords = getNeighborHexCoords(ringCoords, 4);
        }

        //travel around the ring radius steps in each direction.
        for (let dir = 0; dir < 6; dir++) {
            for (let radiusI = 0; radiusI < radius; radiusI++) {
                ringCoords = getNeighborHexCoords(ringCoords, dir);
                coordsList.push(ringCoords);
            }
        }
        return coordsList;
    }

    //const triClueSideLengths = [0, 2, 3, 5, 6, 8, 9, 11, 12, 14, 15, 17, 18, 20, 21, 23, 24, 26, 27, 29, 30];
    function getCellTriCoords(cell, radius, isLeft, is2) {
        let coordsList = [];
        let sideLength = radius * 3 - (is2 ? 1 : 0);//triClueSideLengths[radius];
        let triCoords = [];
        let dirs = [];
        //if ((sideLength % 3 == 0 && isLeft) || (sideLength % 3 == 2 && !isLeft)) {
        if ((isLeft && !is2) || (!isLeft && is2)) {
            triCoords = [cell.x - (Math.floor(sideLength / 3) * 2), cell.y];
            dirs = [1, 5, 3];
        } else {
            triCoords = [cell.x + (Math.floor(sideLength / 3) * 2), cell.y];
            dirs = [3, 5, 1];
        }
        for (let dirI = 0; dirI < dirs.length; dirI++) {
            for (let i = 0; i < sideLength - 1; i++) {
                triCoords = getNeighborHexCoords(triCoords, dirs[dirI]);
                coordsList.push(triCoords);
            }
        }
        return coordsList;
    }

    var HexDirections = [
        {
            "name": "SOUTHEAST",
            "symbol": "↘",
        },
        {
            "name": "NORTHEAST",
            "symbol": "↗",
        },
        {
            "name": "NORTH",
            "symbol": "↑",
        },
        {
            "name": "NORTHWEST",
            "symbol": "↖",
        },
        {
            "name": "SOUTHWEST",
            "symbol": "↙",
        },
        {
            "name": "SOUTH",
            "symbol": "↓",
        },
    ];
    var neighborDirections = [
        [[+1, 0], [+1, -1], [0, -1], [-1, -1], [-1, 0], [0, +1]],
        [[+1, +1], [+1, 0], [0, -1], [-1, 0], [-1, +1], [0, +1]],
    ]
    function getNeighborHexCoords(hexCoords, direction) {
        var parity = hexCoords[0] & 1;
        var dir = neighborDirections[parity][direction];
        return [hexCoords[0] + dir[0], hexCoords[1] + dir[1]];
    }
    function getAllNeighborHexCoords(hexCoords) {
        var neighborHexCoords = [];
        for (var i = 0; i < 6; i++) {
            neighborHexCoords.push(getNeighborHexCoords(hexCoords, i));
        }
        return neighborHexCoords;
    }
    function inBoard(x, y) {
        let inboard = !(typeof board[x] == 'undefined' || typeof board[x][y] == 'undefined');
        return inboard;
    }

    function dedupeArray(ar) {
        var j = {};

        ar.forEach(function (v) {
            j[v + '::' + typeof v] = v;
        });

        return Object.keys(j).map(function (v) {
            return j[v];
        });
    }
    //function solveBoardWithGuesses() {
    //    var log;
    //    $.ajax({
    //        async: false,
    //        url: '/?handler=SolveWithGuesses',
    //        type: 'POST',
    //        headers: {
    //            RequestVerificationToken:
    //                $('input:hidden[name="__RequestVerificationToken"]').val()
    //        },
    //        data: {
    //            boardJSON: JSON.stringify(board),
    //            boardDisplayJSON: JSON.stringify(boardDisplay),
    //            description: description
    //        },
    //        success: function (result) {
    //            registerBoardChange();
    //            board = result.item2;
    //            boardDisplay = result.item3;
    //            undoboards = undoboards.concat(result.item4);
    //            log = result.item1;
    //        },
    //        error: function (result) {
    //            alert(result);
    //        }
    //    });
    //    return log;
    //}
    function setStarBattleCellGroups(starCount) {
        setSudokuCellGroups();
        for (var x = 0; x < COLS; ++x) {
            for (var y = 0; y < ROWS; ++y) {
                var cell = getBoardCell([x, y]);
                if (cell) {
                    for (let group of cell.sudokuCellGroups) {
                        group.totalValue = starCount;
                    }
                }
            }
        }
    }
    function makeSudokuCellGroup(totalValue, cellCoords) {
        return { totalValue: totalValue, cellCoords: cellCoords };
    }
    function setSudokuCellGroups() {
        for (var x = 0; x < COLS; ++x) {
            for (var y = 0; y < ROWS; ++y) {
                var cell = getBoardCell([x, y]);
                if (cell) {
                    cell.sudokuCellGroups = [];

                    for (var i = 0; i < 3; i++) {
                        var axisCoords = [];
                        //for each direction
                        for (var i2 = 0; i2 < 4; i2 += 3) {
                            var x2 = x;
                            var y2 = y;
                            //travel to the edge of the board, cataloging cells on the way.
                            while (true) {
                                let neighborcoords = getNeighborHexCoords([x2, y2], i + i2);
                                x2 = neighborcoords[0];
                                y2 = neighborcoords[1];
                                if (!inBoard(x2, y2)) {
                                    break;
                                }
                                if (getBoardCell([x2, y2])) {
                                    axisCoords.push([x2, y2]);
                                }
                            }
                        }
                        cell.sudokuCellGroups.push(makeSudokuCellGroup(0, axisCoords));
                    }
                }
            }
        }
    }
    function getNumStarsInGroup(flatBoard, coordsList) {
        let seenStars = 0;
        for (let coords of coordsList) {
            if (flatBoard[coords[0]][coords[1]].hexTypeID == 3) {
                seenStars++;
            }
        }
        return seenStars;
    }
    let colCellGroupsCoords = [];
    function getColCellGroups(flatBoard) {
        if (colCellGroupsCoords.length == 0) {
            for (let i = 0; i < COLS; i++) {
                let colGroup = [];
                for (let j = 0; j < ROWS; j++) {
                    let cell = flatBoard[i][j];
                    if (cell.hexTypeID > 0) {
                        colGroup.push([cell.x, cell.y]);
                    }
                }
                if (colGroup.length) {
                    colCellGroupsCoords.push(colGroup);
                }
            }
            //northwest to southeast, part 1.
            for (let i = 0; i < COLS; i += 2) {
                let colGroup = [];
                let coords = [i, 0];
                while (inBoard(coords[0], coords[1])) {
                    let cell = flatBoard[coords[0]][coords[1]];
                    if (cell.hexTypeID > 0) {
                        colGroup.push([cell.x, cell.y]);
                    }
                    coords = getNeighborHexCoords(coords, 0);
                }
                if (colGroup.length) {
                    colCellGroupsCoords.push(colGroup);
                }
            }
            //northwest to southeast, part 2.
            for (let i = 1; i < ROWS; i++) {
                let colGroup = [];
                let coords = [0, i];
                while (inBoard(coords[0], coords[1])) {
                    let cell = flatBoard[coords[0]][coords[1]];
                    if (cell.hexTypeID > 0) {
                        colGroup.push([cell.x, cell.y]);
                    }
                    coords = getNeighborHexCoords(coords, 0);
                }
                if (colGroup.length) {
                    colCellGroupsCoords.push(colGroup);
                }
            }
            //southwest to northeast, part 1.
            for (let i = 1; i < COLS; i += 2) {
                let colGroup = [];
                let coords = [i, ROWS - 1];
                while (inBoard(coords[0], coords[1])) {
                    let cell = flatBoard[coords[0]][coords[1]];
                    if (cell.hexTypeID > 0) {
                        colGroup.push([cell.x, cell.y]);
                    }
                    coords = getNeighborHexCoords(coords, 1);
                }
                if (colGroup.length) {
                    colCellGroupsCoords.push(colGroup);
                }
            }
            //southwest to northeast, part 2.
            for (let i = 1; i < ROWS; i++) {
                let colGroup = [];
                let coords = [0, i];
                while (inBoard(coords[0], coords[1])) {
                    let cell = flatBoard[coords[0]][coords[1]];
                    if (cell.hexTypeID > 0) {
                        colGroup.push([cell.x, cell.y]);
                    }
                    coords = getNeighborHexCoords(coords, 1);
                }
                if (colGroup.length) {
                    colCellGroupsCoords.push(colGroup);
                }
            }
        }
        var colCellGroups = [];
        for (let coordsList of colCellGroupsCoords) {
            let colGroup = [];
            for (let coords of coordsList) {
                colGroup.push(flatBoard[coords[0]][coords[1]]);
            }
            colCellGroups.push(colGroup);
        }
        return colCellGroups;
    }
    function getMouseHexCoords(mouseX, mouseY) {
        //todo: limit the seach space if time is a factor
        for (var x = 0; x < board.length; ++x) {
            for (var y = 0; y < board[x].length; ++y) {
                setPath(x, y);
                if (ctx.isPointInPath(mouseX, mouseY)) {
                    return [x, y];
                }
            }
        }
        return [-1, -1];
    };
    function getBoardCell(hexCoords) {
        if (inBoard(hexCoords[0], hexCoords[1])) {
            return board[hexCoords[0]][hexCoords[1]];
        } else {
            return undefined;
        }
    };
    let autoUnshade = false;
    function setBoardHexType(hexCoords, hexTypeID) {
        var cell = board[hexCoords[0]][hexCoords[1]];
        if (typeof cell != 'undefined') {
            cell.hexTypeID = hexTypeID;
            if (autoUnshade && !solveMode && hexTypeID == 3) {
                registerBoardChange();
                if (!toolClickAutoUnshade()) {
                    undoBoardChange();
                    cell.hexTypeID = 1;
                }
            }
            cell.showRing = true;
        } else {
            board[hexCoords[0]][hexCoords[1]] = new Cell(hexCoords[0], hexCoords[1], hexTypeID, 0, null, true, 1, 0, "", 1, 0, "", 1, 0, "", 1, 0, "");
        }
    };
    function setBoardNumber(hexCoords, number) {
        var cell = board[hexCoords[0]][hexCoords[1]];
        if (cell.number == number && cell.label == "") {
            cell.number = 0;
        } else {
            cell.number = number;
            cell.label = "";
        }
    };

    function getBoardCopy() {
        var boardCopy = [];
        for (var x = 0; x < COLS; ++x) {
            boardCopy[x] = [];
            for (var y = 0; y < ROWS; ++y) {
                var cell = board[x][y];
                boardCopy[x][y] = getCellClone(cell);
            }
        }
        return boardCopy;
    };

    function drawString(s, inX, inY, color, backgroundColor, maxWidth) {
        ctx.fillStyle = color;
        ctx.fillText(s, inX, inY, maxWidth);
        return;
        //var pixels = [];
        //var x = inX;
        //var y = inY;
        //for (var i = 0; i < s.length; i++) {
        //    var charObj = pixelChars[s[i].charCodeAt(0)];
        //    if (!charObj) {
        //        charObj = pixelChars["�".charCodeAt(0)];
        //    }

        //    if (maxWidth && x + charObj.width + 1 > inX + maxWidth - 2) {
        //        x = inX;
        //        y += 12;
        //    }
        //    x -= charObj.xOffset;

        //    var px = 3;
        //    var py = 0;
        //    for (var pi = 0; pi < charObj.pixels.length; pi++) {
        //        if (charObj.pixels[pi]) {
        //            pixels.push([x + px, y + py]);
        //        }
        //        if (px == 3 && py == 0) {
        //            px = 0;
        //            py++;
        //        } else if (px == 6 && py == 7) {
        //            py += 1;
        //            px = 3;
        //        } else if (px == 6) {
        //            px = 0;
        //            py++;
        //        } else {
        //            px++;
        //        }
        //    }
        //    x += charObj.xOffset + charObj.width + 1;
        //}

        //var stringLength = maxWidth ? maxWidth : x - inX;
        //var xOffset = 0;
        //if (inX + stringLength + 1 > canvasW) {
        //    xOffset = inX - (canvasW - stringLength - 1);
        //    inX = canvasW - stringLength - 1;
        //}
        //if (backgroundColor) {
        //    ctx.fillStyle = backgroundColor;
        //    ctx.fillRect(inX - 1.5, inY - 1.5, stringLength + 2, 12);
        //    ctx.strokeStyle = "black";
        //    ctx.strokeRect(inX - 1.5, inY - 1.5, stringLength + 2, 12);
        //}
        //ctx.fillStyle = color;
        //for (var i = 0; i < pixels.length; i++) {
        //    ctx.fillRect(pixels[i][0] - xOffset, pixels[i][1], 1, 1);
        //}
    }

    var pixelChars = {};
    function pushToPixels(key, stringValue) {
        var arr = [];
        for (var i = 0; i < stringValue.length; i++) {
            arr.push(stringValue[i] != " ");
        }
        //determine the rightmost and leftmost pixels.  Assume that the middle pixel is filled.
        var leftmostOffset = undefined;
        var rightmostOffset = undefined;
        if (key == " ") {
            leftmostOffset = 2;
            rightmostOffset = 4;
        } else {
            for (var j = 0; j < 3; j++) {
                for (var j2 = 1; j2 < 47; j2 += 7) {
                    if (arr[j2 + j]) {
                        leftmostOffset = j;
                        break;
                    }
                }
                if (leftmostOffset != undefined) {
                    break;
                }
            }
            if (leftmostOffset == undefined) {
                leftmostOffset = 3;
            }

            for (var j = 0; j < 3; j++) {
                for (var j2 = 7; j2 < 50; j2 += 7) {
                    if (arr[j2 - j]) {
                        rightmostOffset = 6 - j;
                        break;
                    }
                }
                if (rightmostOffset != undefined) {
                    break;
                }
            }
            if (rightmostOffset == undefined) {
                rightmostOffset = 3;
            }


        }

        pixelChars[key.charCodeAt(0)] = {
            "pixels": arr,
            "width": rightmostOffset - leftmostOffset + 1,
            "xOffset": leftmostOffset,
        };
    }

    var keys = {
        //arrow keys
        37: 'left', //left arrow
        38: 'up', //up arrow
        39: 'right', //right arrow
        40: 'down', //down arrow
        16: 'rotateCCW', //shift
        //38: 'rotateCW', //up arrow
        17: 'swapaction', //ctrl

        //numpad
        100: 'left', //numpad 4
        102: 'right', //numpad 6
        101: 'down', //numpad 5
        103: 'rotateCCW', //numpad 7
        104: 'rotateCW', //numpad 8
        96: 'swapaction', //numpad 0

        //letters
        65: 'a',
        66: 'b',
        67: 'c',
        68: 'd',
        69: 'e',
        70: 'f',
        71: 'g',
        72: 'h',
        73: 'i',
        74: 'j',
        75: 'k',
        76: 'l',
        77: 'm',
        78: 'n',
        75: 'o',
        80: 'p',
        81: 'q',
        82: 'r',
        83: 's',
        84: 't',
        85: 'u',
        86: 'v',
        87: 'w',
        88: 'x',
        89: 'y',
        90: 'z',

        46: 'delete',

        //number keys, used for cheats
        48: 'key_0', //0
        49: 'key_1', //1
        50: 'key_2', //2
        51: 'key_3', //3
        52: 'key_4', //4
        53: 'key_5', //5
        54: 'key_6', //6
        55: 'key_7', //7
        56: 'key_8', //8
        57: 'key_9', //9

        //Other:
        27: 'pause', //Esc
        192: '`',
    };
    document.body.onkeydown = function (e) {
        var handled = false;
        var keyname = keys[e.keyCode];
        if (typeof keyname != 'undefined') {
            keyname = (e.ctrlKey ? "^" : "") + (e.shiftKey ? "+" : "") + keyname;
            $.each(tools, function (idx, tool) {
                if (keyname == tool.shortcutKey) {
                    handled = tool.click(e.ctrlKey, e.shiftKey);
                }
            });
            if (!handled) {
                //else if (keyname == 'left') {
                //    if (currentHexType > 1) {
                //        currentHexType--;
                //    }
                //    drawBoard();
                //}
                //else if (keyname == 'right') {
                //    if (currentHexType < 7) {
                //        currentHexType++;
                //    }
                //    drawBoard();
                //}
            }
        }
        if (!handled) {
            if (e.key == 'z' && e.ctrlKey) {
                //undo
                undoBoardChange();
                drawBoard();

            } else if (e.key == 'Z' && e.ctrlKey) {
                //super undo
                undoBoardChange(10);
                drawBoard();

            } else if (e.key == 'y' && e.ctrlKey) {
                //redo
                redoBoardChange();
                drawBoard();
            } else if (e.key == 'Y' && e.ctrlKey) {
                //super redo
                redoBoardChange(10);
                drawBoard();
            } else if (e.key == 'Y' && e.ctrlKey) {
                //super redo
                redoBoardChange(10);
                drawBoard();
            }
        }
    };

    var $canvas = $("canvas");// = document.getElementById('canvas');
    var canvasW = Math.min($canvas.width(), $canvas.height());
    var canvasH = canvasW;
    canvas.width = canvasW;
    canvas.height = canvasH;
    $canvas.width(canvasW);
    $canvas.height(canvasH);
    var linelen = 20;//6;//20;//
    var HEX_W;
    var HEX_H;
    var HEX_PATH;
    var canvasDrawingXOff = 0;
    var canvasDrawingYOff = 0;
    function recalcDrawingOffsets() {
        linelen = (canvasH - 20) / (COLS * 2 / 1.1547);
        HEX_W = linelen * 1.5;
        HEX_H = linelen * 2 / 1.1547;
        HEX_PATH = [
            [linelen * 1.5, HEX_H],
            [linelen * 2.0, HEX_H / 2],
            [linelen * 1.5, 0],
            [linelen * 0.5, 0],
            [0, HEX_H / 2],
            [linelen * 0.5, HEX_H],
        ];

        canvasDrawingXOff = canvasW / 2 - (HEX_W * COLS) / 2;
        canvasDrawingYOff = canvasH / 2 - HEX_H * COLS / 2 - ((Math.ceil(COLS / 2)) % 2 ? 0 : HEX_H / 2);
    }

    var COLS = 11;//19;//
    var ROWS = 11;//13;//19;// //N rows, plus creating a V at the bottom.  with COLS = 11, this means 5 extra rows.
    var board;
    var undoboards;//used for undo
    var redoboards;//used for redo
    var solveMode = true;
    var showClueLetters = false;
    var showLeftTriangles = false;
    var showRightTriangles = false;
    var settingLabel = false;
    var settingLabelLabel = "?";

    function toggleSolveMode() {
        solveMode = !solveMode;
        if (solveMode && currentHexType > 10) {
            currentHexType = -1;
        }
        settingLabel = false;
        createTools();
        drawBoard();
    }

    var description;

    var ctx = canvas.getContext('2d');
    ctx.lineCap = "round";
    ctx.shadowColor = 'black';
    ctx.font = '20px sans-serif';

    var $canvas = $(canvas);


    $canvas.mousedown(handleMouse);
    $canvas.mousemove(handleMouse);
    $canvas.mouseup(handleMouse);
    canvas.ontouchstart = handleMouse;
    canvas.ontouchmove = handleMouse;
    canvas.ontouchend = handleMouse;

    var hexTypeNames = {
        "None": "None",
        "Unshaded": "Unshaded",
        "Shaded": "Shaded",
        "Red": "Red",
        "Yellow": "Yellow",
        "Green": "Green",
        "Teal": "Teal",
        "Blue": "Blue",
        "Purple": "Purple",
        "Violet": "Violet",
        "Zero": "0",
        "One": "1",
        "Two": "2",
        "Three": "3",
        "Four": "4",
        "Five": "5",
        "Six": "6",
    };
    var hexTypes = [
        {
            name: hexTypeNames.None,
            color: "gray",
            symbol: "",
        }, {
            name: hexTypeNames.None,
            color: "white",
            symbol: "",
        }, {
            name: hexTypeNames.Unshaded,
            color: "burlywood",
            symbol: "",
        }, {
            name: hexTypeNames.Shaded,
            color: "saddlebrown",
            symbol: "",//"#",
        }, {
            name: hexTypeNames.Red,
            color: "#D91B4E",
            symbol: "A",//"➕",
            radius: 0,
        }, {
            name: hexTypeNames.Yellow,
            color: "#f0c600",//"Goldenrod",
            symbol: "B",//"➕",
            radius: 0,
        }, {
            name: hexTypeNames.Green,
            color: "LimeGreen",
            symbol: "C",//"☇",
            radius: 0,
        }, {
            name: hexTypeNames.Teal,
            color: "Turquoise",
            symbol: "D",//"☆",
            radius: 0,
        }, {
            name: hexTypeNames.Blue,
            color: "#2180BE",//1A6699  
            symbol: "E",//"★",
            radius: 0,
        }, {
            name: hexTypeNames.Purple,
            color: "RebeccaPurple",
            symbol: "F",//"⛨",
            radius: 0,
        }, {
            name: hexTypeNames.Violet,
            color: "Violet",
            symbol: "G",//"★",
            radius: 0,
        },
        {
            name: hexTypeNames.Zero,
            color: "Plum",
            symbol: "0",
            shortcutKey: 'key_0',
        },
        {
            name: hexTypeNames.One,
            color: "Plum",
            symbol: "1",
            shortcutKey: 'key_1',
        },
        {
            name: hexTypeNames.Two,
            color: "Plum",
            symbol: "2",
            shortcutKey: 'key_2',
        },
        {
            name: hexTypeNames.Three,
            color: "Plum",
            symbol: "3",
            shortcutKey: 'key_3',
        },
        {
            name: hexTypeNames.Four,
            color: "Plum",
            symbol: "4",
            shortcutKey: 'key_4',
        },
        {
            name: hexTypeNames.Five,
            color: "Plum",
            symbol: "5",
            shortcutKey: 'key_5',
        },
        {
            name: hexTypeNames.Six,
            color: "Plum",
            symbol: "6",
            shortcutKey: 'key_6',
        },
    ];
    var hexTypeMap = {};
    for (var i = 0; i < hexTypes.length; i++) {
        var hexType = hexTypes[i];
        hexTypeMap[hexType.name] = i;
    };
    (function addPixelChars() {
        pushToPixels("A", "Q" +
            " QQ QQ " +
            "Q     Q" +
            "Q     Q" +
            "Q  Q  Q" +
            "QQQ QQQ" +
            "Q     Q" +
            "Q     Q" +
            " ");
        pushToPixels("B", "Q" +
            "QQQ QQ " +
            "Q     Q" +
            "Q  Q  Q" +
            "QQQ QQ " +
            "Q     Q" +
            "Q     Q" +
            "QQQ QQ " +
            "Q");
        pushToPixels("C", "Q" +
            " QQ QQ " +
            "Q     Q" +
            "Q      " +
            "Q      " +
            "Q      " +
            "Q     Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("D", "Q" +
            "QQQ QQ " +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            "QQQ QQ " +
            "Q");
        pushToPixels("E", "Q" +
            "QQQ QQ " +
            "Q     Q" +
            "Q  Q   " +
            "QQQ Q  " +
            "Q      " +
            "Q     Q" +
            "QQQ QQ " +
            "Q");
        pushToPixels("F", "Q" +
            "QQQ QQ " +
            "Q     Q" +
            "Q      " +
            "Q  Q   " +
            "QQQ QQ " +
            "Q      " +
            "Q      " +
            " ");
        pushToPixels("G", "Q" +
            " QQ QQ " +
            "Q     Q" +
            "Q      " +
            "Q   QQ " +
            "Q  Q  Q" +
            "Q     Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("H", " " +
            "Q     Q" +
            "Q     Q" +
            "Q  Q  Q" +
            "QQQ QQQ" +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            " ");
        pushToPixels("I", "Q" +
            " QQQQQ " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            " QQQQQ " +
            "Q");
        pushToPixels("J", " " +
            "    QQQ" +
            "      Q" +
            "      Q" +
            "      Q" +
            "      Q" +
            "      Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("K", " " +
            "Q     Q" +
            "Q     Q" +
            "Q   QQ " +
            "Q  Q   " +
            "QQQ QQ " +
            "Q     Q" +
            "Q     Q" +
            " ");
        pushToPixels("L", " " +
            "Q      " +
            "Q      " +
            "Q      " +
            "Q      " +
            "Q      " +
            "Q      " +
            "QQQ QQQ" +
            "Q");
        pushToPixels("M", " " +
            "Q     Q" +
            "QQQ QQQ" +
            "Q  Q  Q" +
            "Q  Q  Q" +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            " ");
        pushToPixels("N", " " +
            "Q     Q" +
            "QQQ   Q" +
            "Q  Q  Q" +
            "Q  Q  Q" +
            "Q  Q  Q" +
            "Q   QQQ" +
            "Q     Q" +
            " ");
        pushToPixels("O", "Q" +
            " QQ QQ " +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("P", "Q" +
            "QQQ QQ " +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            "QQQ QQ " +
            "Q  Q   " +
            "Q      " +
            " ");
        pushToPixels("Q", "Q" +
            " QQ QQ " +
            "Q     Q" +
            "Q     Q" +
            "Q  Q  Q" +
            "Q   QQQ" +
            "Q     Q" +
            " QQ QQQ" +
            "Q");
        pushToPixels("R", "Q" +
            "QQQ QQ " +
            "Q     Q" +
            "Q     Q" +
            "Q  Q  Q" +
            "QQQ QQ " +
            "Q     Q" +
            "Q     Q" +
            " ");
        pushToPixels("S", "Q" +
            " QQ QQ " +
            "Q     Q" +
            "Q  Q   " +
            " QQ QQ " +
            "      Q" +
            "Q     Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("T", "Q" +
            " QQQQQ " +
            "Q  Q  Q" +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "Q");
        pushToPixels("U", " " +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("V", " " +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            " Q   Q " +
            "  Q Q  " +
            "  Q Q  " +
            "Q");
        pushToPixels("W", " " +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            "Q  Q  Q" +
            "Q  Q  Q" +
            " QQ QQ " +
            " ");
        pushToPixels("X", " " +
            "Q     Q" +
            "Q     Q" +
            " QQ QQ " +
            "   Q   " +
            " QQ QQ " +
            "Q     Q" +
            "Q     Q" +
            " ");
        pushToPixels("Y", " " +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            " QQ QQ " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "Q");
        pushToPixels("Z", "Q" +
            "QQQ QQQ" +
            "      Q" +
            "    QQ " +
            "   Q   " +
            " QQ    " +
            "Q      " +
            "QQQ QQQ" +
            "Q");
        pushToPixels("a", "Q" +
            " QQ QQ " +
            "Q     Q" +
            "   Q  Q" +
            " QQ QQQ" +
            "Q     Q" +
            "Q     Q" +
            " QQ QQQ" +
            "Q");
        pushToPixels("b", " " +
            "Q      " +
            "Q      " +
            "Q  Q   " +
            "QQQ QQ " +
            "Q     Q" +
            "Q     Q" +
            "QQQ QQ " +
            "Q");
        pushToPixels("c", " " +
            "       " +
            "   Q   " +
            " QQ QQ " +
            "Q      " +
            "Q      " +
            "Q     Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("d", " " +
            "      Q" +
            "      Q" +
            "   Q  Q" +
            " QQ QQQ" +
            "Q     Q" +
            "Q     Q" +
            " QQ QQQ" +
            "Q");
        pushToPixels("e", " " +
            "       " +
            "   Q   " +
            " QQ QQ " +
            "Q  Q  Q" +
            "QQQ QQ " +
            "Q      " +
            " QQ QQQ" +
            "Q");
        pushToPixels("f", " " +
            "   Q   " +
            "  Q QQ " +
            " Q     " +
            " Q Q   " +
            " QQ QQ " +
            " Q     " +
            " Q     " +
            " ");
        pushToPixels("g", " " +
            "   Q   " +
            " QQ QQ " +
            "Q     Q" +
            " QQ QQQ" +
            "   Q  Q" +
            "Q     Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("h", " " +
            " Q     " +
            " Q     " +
            " Q Q   " +
            " QQ QQ " +
            " Q   Q " +
            " Q   Q " +
            " Q   Q " +
            " ");
        pushToPixels("i", " " +
            "   Q   " +
            "       " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "Q");
        pushToPixels("j", " " +
            "    Q  " +
            "       " +
            "    Q  " +
            "    Q  " +
            "    Q  " +
            "    Q  " +
            "  Q Q  " +
            "Q");
        pushToPixels("k", " " +
            " Q     " +
            " Q  Q  " +
            " Q  Q  " +
            " Q Q   " +
            " QQ QQ " +
            " Q   Q " +
            " Q   Q " +
            " ");
        pushToPixels("l", " " +
            "  Q    " +
            "  Q    " +
            "  Q    " +
            "  Q    " +
            "  Q    " +
            "  Q    " +
            "  Q Q  " +
            "Q");
        pushToPixels("m", " " +
            "       " +
            "       " +
            "QQQ QQ " +
            "Q  Q  Q" +
            "Q  Q  Q" +
            "Q     Q" +
            "Q     Q" +
            " ");
        pushToPixels("n", " " +
            "       " +
            "       " +
            "Q  Q   " +
            "QQQ QQ " +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            " ");
        pushToPixels("o", " " +
            "       " +
            "   Q   " +
            " QQ QQ " +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("p", " " +
            "   Q   " +
            " QQ QQ " +
            "Q     Q" +
            "Q     Q" +
            "QQQ QQ " +
            "Q  Q   " +
            "Q      " +
            " ");
        pushToPixels("q", " " +
            "   Q   " +
            " QQ QQ " +
            "Q     Q" +
            "Q     Q" +
            " QQ QQQ" +
            "   Q  Q" +
            "      Q" +
            " ");
        pushToPixels("r", " " +
            "       " +
            "       " +
            " Q Q   " +
            " QQ QQ " +
            " Q     " +
            " Q     " +
            " Q     " +
            " ");
        pushToPixels("s", " " +
            "       " +
            "   Q   " +
            " QQ QQ " +
            "Q  Q  Q" +
            " QQ QQ " +
            "      Q" +
            "QQQ QQ " +
            "Q");
        pushToPixels("t", "Q" +
            "   Q   " +
            "   Q   " +
            " QQQQQ " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "Q");
        pushToPixels("u", " " +
            "       " +
            "       " +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            " QQ QQQ" +
            "Q");
        pushToPixels("v", " " +
            "       " +
            "       " +
            "Q     Q" +
            "Q     Q" +
            " Q   Q " +
            "  Q Q  " +
            "  Q Q  " +
            "Q");
        pushToPixels("w", " " +
            "       " +
            "       " +
            "Q     Q" +
            "Q     Q" +
            "Q  Q  Q" +
            "Q  Q  Q" +
            " QQ QQ " +
            " ");
        pushToPixels("x", " " +
            "       " +
            "       " +
            "Q     Q" +
            " QQ QQ " +
            "   Q   " +
            " QQ QQ " +
            "Q     Q" +
            " ");
        pushToPixels("y", " " +
            "       " +
            "       " +
            "Q     Q" +
            "Q     Q" +
            " QQ QQ " +
            "   Q   " +
            "   Q   " +
            "Q");
        pushToPixels("z", " " +
            "       " +
            "   Q   " +
            "QQQ QQQ" +
            "   Q  Q" +
            " QQ QQ " +
            "Q      " +
            "QQQ QQQ" +
            "Q");
        pushToPixels("1", "Q" +
            "  QQ   " +
            " Q Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            " QQQQQ " +
            "Q");
        pushToPixels("2", "Q" +
            " QQ QQ " +
            "Q     Q" +
            "      Q" +
            "    QQ " +
            " QQQ   " +
            "Q     Q" +
            "QQQ QQQ" +
            "Q");
        pushToPixels("3", "Q" +
            " QQ QQ " +
            "Q     Q" +
            "      Q" +
            "   QQQ " +
            "      Q" +
            "Q     Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("4", " " +
            " Q    Q" +
            "Q     Q" +
            "Q     Q" +
            "QQQ QQQ" +
            "   Q  Q" +
            "      Q" +
            "      Q" +
            " ");
        pushToPixels("5", "Q" +
            "QQQ QQQ" +
            "Q     Q" +
            "Q  Q   " +
            "QQQ QQ " +
            "      Q" +
            "Q     Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("6", "Q" +
            " QQ QQ " +
            "Q     Q" +
            "Q  Q   " +
            "QQQ QQ " +
            "Q     Q" +
            "Q     Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("7", "Q" +
            "QQQ QQQ" +
            "Q     Q" +
            "      Q" +
            "    QQ " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "Q");
        pushToPixels("8", "Q" +
            " QQ QQ " +
            "Q     Q" +
            "Q  Q  Q" +
            " QQ QQ " +
            "Q     Q" +
            "Q     Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("9", "Q" +
            " QQ QQ " +
            "Q     Q" +
            "Q     Q" +
            " QQ QQQ" +
            "   Q  Q" +
            "Q     Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("0", "Q" +
            " QQ QQ " +
            "Q    QQ" +
            "Q   Q Q" +
            "Q  Q  Q" +
            "Q Q   Q" +
            "QQ    Q" +
            " QQ QQ " +
            "Q");
        pushToPixels(":", " " +
            "       " +
            "       " +
            "   Q   " +
            "       " +
            "       " +
            "   Q   " +
            "       " +
            " ");
        pushToPixels("-", " " +
            "       " +
            "       " +
            "       " +
            " QQQQQ " +
            "       " +
            "       " +
            "       " +
            " ");
        pushToPixels(",", " " +
            "       " +
            "       " +
            "       " +
            "       " +
            "       " +
            "    Q  " +
            "    Q  " +
            "Q");
        pushToPixels("'", " " +
            "    Q  " +
            "    Q  " +
            "   Q   " +
            "       " +
            "       " +
            "       " +
            "       " +
            " ");
        pushToPixels(";", " " +
            "       " +
            "       " +
            "    Q  " +
            "       " +
            "       " +
            "    Q  " +
            "    Q  " +
            "Q");
        pushToPixels(".", " " +
            "       " +
            "       " +
            "       " +
            "       " +
            "       " +
            "       " +
            "   Q   " +
            " ");
        pushToPixels("?", "Q" +
            " QQ QQ " +
            "Q     Q" +
            "Q     Q" +
            "    QQ " +
            "   Q   " +
            "       " +
            "   Q   " +
            " ");
        pushToPixels("!", "Q" +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "       " +
            "       " +
            "Q");
        pushToPixels("/", " " +
            "     Q " +
            "     Q " +
            "    Q  " +
            "   Q   " +
            "  Q    " +
            " Q     " +
            " Q     " +
            " ");
        pushToPixels("\\", " " +
            " Q     " +
            " Q     " +
            "  Q    " +
            "   Q   " +
            "    Q  " +
            "     Q " +
            "     Q " +
            " ");
        pushToPixels("�", "Q" +
            "  QQQ  " +
            " Q   Q " +
            "Q QQQ Q" +
            "QQQQ QQ" +
            "QQQ QQQ" +
            " QQQQQ " +
            "  Q Q  " +
            "Q");

        pushToPixels("↥", "Q" +
            "  Q Q  " +
            " Q   Q " +
            "QQQ QQQ" +
            "  Q Q  " +
            "  Q Q  " +
            "  Q Q  " +
            "QQQ QQQ" +
            " ");
        pushToPixels("↧", " " +
            "QQQ QQQ" +
            "  Q Q  " +
            "  Q Q  " +
            "  Q Q  " +
            "QQQ QQQ" +
            " Q   Q " +
            "  Q Q  " +
            "Q");
        pushToPixels("↑", "Q" +
            "  QQQ  " +
            " QQQQQ " +
            "QQQQQQQ" +
            "  QQQ  " +
            "  QQQ  " +
            "  QQQ  " +
            "  Q Q  " +
            " ");
        pushToPixels("↓", " " +
            "  Q Q  " +
            "  QQQ  " +
            "  QQQ  " +
            "  QQQ  " +
            "QQQQQQQ" +
            " QQQQQ " +
            "  QQQ  " +
            "Q");
        pushToPixels("↖", " " +
            "QQQQQ  " +
            "QQQQ   " +
            "QQQQ   " +
            "QQQQQ  " +
            "Q  QQQ " +
            "    QQQ" +
            "     Q " +
            " ");
        pushToPixels("↗", " " +
            "  QQQQQ" +
            "   QQQQ" +
            "   QQQQ" +
            "  QQQQQ" +
            " QQQ  Q" +
            "QQQ    " +
            " Q     " +
            " ");
        pushToPixels("↘", " " +
            " Q     " +
            "QQQ    " +
            " QQQ  Q" +
            "  QQQQQ" +
            "   QQQQ" +
            "   QQQQ" +
            "  QQQQQ" +
            " ");
        pushToPixels("↙", " " +
            "     Q " +
            "    QQQ" +
            "Q  QQQ " +
            "QQQQQ  " +
            "QQQQ   " +
            "QQQQ   " +
            "QQQQQ  " +
            " ");
        pushToPixels("@", "Q" +
            " QQ QQ " +
            "Q  Q  Q" +
            "Q Q Q Q" +
            "Q Q  QQ" +
            "Q Q  Q " +
            "Q  QQ  " +
            " QQ QQQ" +
            "Q");
        pushToPixels("*", "Q" +
            "Q  Q  Q" +
            " Q Q Q " +
            "   Q   " +
            "QQQQQQQ" +
            "   Q   " +
            " Q Q Q " +
            "Q  Q  Q" +
            "Q");
        pushToPixels("#", " " +
            " Q   Q " +
            "QQQQQQQ" +
            " Q   Q " +
            " Q   Q " +
            " Q   Q " +
            "QQQQQQQ" +
            " Q   Q " +
            " ");
        pushToPixels("+", " " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "QQQQQQQ" +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            " ");
        pushToPixels("$", "Q" +
            " QQQQQ " +
            "Q  Q  Q" +
            "Q  Q   " +
            " QQQQQ " +
            "   Q  Q" +
            "Q  Q  Q" +
            " QQQQQ " +
            "Q");
        pushToPixels("&", "Q" +
            "  Q Q  " +
            " Q  Q  " +
            "  QQ   " +
            " Q QQ Q" +
            "Q   Q Q" +
            "Q   QQ " +
            " QQQ QQ" +
            " ");
        pushToPixels("%", " " +
            "     Q " +
            " Q   Q " +
            "    Q  " +
            "   Q   " +
            "  Q    " +
            " Q   Q " +
            " Q     " +
            " ");
        pushToPixels("^", " " +
            "   Q   " +
            "  Q Q  " +
            " Q   Q " +
            "       " +
            "       " +
            "       " +
            "       " +
            " ");
        pushToPixels("(", "Q" +
            "  Q    " +
            "  Q    " +
            " Q     " +
            " Q     " +
            " Q     " +
            "  Q    " +
            "  Q    " +
            "Q");
        pushToPixels(")", "Q" +
            "    Q  " +
            "    Q  " +
            "     Q " +
            "     Q " +
            "     Q " +
            "    Q  " +
            "    Q  " +
            "Q");
        pushToPixels("_", " " +
            "       " +
            "       " +
            "       " +
            "       " +
            "       " +
            "       " +
            "QQQQQQQ" +
            " ");
        pushToPixels("=", " " +
            "       " +
            "       " +
            " QQQQQ " +
            "       " +
            " QQQQQ " +
            "       " +
            "       " +
            " ");
        pushToPixels("`", " " +
            " QQ    " +
            "   Q   " +
            "       " +
            "       " +
            "       " +
            "       " +
            "       " +
            " ");
        pushToPixels("~", " " +
            "       " +
            "       " +
            "  QQ  Q" +
            " Q  QQ " +
            "       " +
            "       " +
            "       " +
            " ");
        pushToPixels("[", " " +
            " QQQ   " +
            " Q     " +
            " Q     " +
            " Q     " +
            " Q     " +
            " Q     " +
            " QQQ   " +
            " ");
        pushToPixels("]", " " +
            "   QQQ " +
            "     Q " +
            "     Q " +
            "     Q " +
            "     Q " +
            "     Q " +
            "   QQQ " +
            " ");
        pushToPixels("{", "Q" +
            "  Q    " +
            "  Q    " +
            "  Q    " +
            " Q     " +
            "  Q    " +
            "  Q    " +
            "  Q    " +
            "Q");
        pushToPixels("}", "Q" +
            "    Q  " +
            "    Q  " +
            "    Q  " +
            "     Q " +
            "    Q  " +
            "    Q  " +
            "    Q  " +
            "Q");
        pushToPixels("|", "Q" +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "Q");
        pushToPixels("\"", " " +
            " Q  Q  " +
            " Q  Q  " +
            " Q  Q  " +
            "       " +
            "       " +
            "       " +
            "       " +
            " ");
        pushToPixels(">", " " +
            "       " +
            " QQ    " +
            "   QQ  " +
            "     Q " +
            "   QQ  " +
            " QQ    " +
            "       " +
            " ");
        pushToPixels("<", " " +
            "       " +
            "    QQ " +
            "  QQ   " +
            " Q     " +
            "  QQ   " +
            "    QQ " +
            "       " +
            " ");
        pushToPixels("⚫", " " +
            "       " +
            "  QQQ  " +
            " QQQQQ " +
            " QQQQQ " +
            " QQQQQ " +
            "  QQQ  " +
            "       " +
            " ");
        pushToPixels(hexTypes[hexTypeMap[hexTypeNames.Green]].symbol, "Q" +
            "  Q Q  " +
            "QQQ QQQ" +
            "Q     Q" +
            " Q   Q " +
            " Q Q Q " +
            "Q Q Q Q" +
            "QQ   QQ" +
            " ");
        pushToPixels(hexTypes[hexTypeMap[hexTypeNames.Teal]].symbol, "Q" +
            "  QQQ  " +
            "QQQQQQQ" +
            "QQQQQQQ" +
            " QQQQQ " +
            " QQQQQ " +
            "QQQ QQQ" +
            "QQ   QQ" +
            " ");
        pushToPixels(hexTypes[hexTypeMap[hexTypeNames.Yellow]].symbol, "Q" +
            "  Q QQ " +
            "  Q   Q" +
            " Q  QQ " +
            " Q Q   " +
            "  Q Q  " +
            " Q QQ  " +
            "QQQ    " +
            " ");
        pushToPixels(hexTypes[hexTypeMap[hexTypeNames.Red]].symbol, " " +
            "  QQQ  " +
            "  Q Q  " +
            "QQQ QQQ" +
            "Q     Q" +
            "QQQ QQQ" +
            "  Q Q  " +
            "  QQQ  " +
            " ");
        pushToPixels(hexTypes[hexTypeMap[hexTypeNames.Blue]].symbol, "Q" +
            "QQQ QQQ" +
            "Q     Q" +
            "Q  Q  Q" +
            "Q QQQ Q" +
            "Q  Q  Q" +
            " Q   Q " +
            "  Q Q  " +
            "Q");
        pushToPixels(" ", " " +
            "       " +
            "       " +
            "       " +
            "       " +
            "       " +
            "       " +
            "       " +
            " ");
    })();

    var currentHexType = -1;
    var tools = [];
    var mouseOverTexts = [];

    var toolMargin = 5;
    var toolWidth = 30;
    var toolHeight = 30;
    var toolBoxLeft = toolMargin + .5;//canvasW - .5 - (toolWidth + toolMargin) * toolColumns;

    function createTools() {
        tools = [];

        tools.push({
            name: "Undo (or Ctrl+z)(+Shift to undo 10 steps at a time)",
            color: "lightgray",
            //shortcutKey: "^up",
            click: function (ctrlKey, shiftKey) {
                undoBoardChange(shiftKey ? 10 : 1);
                drawBoard();
                return true;
            },
            draw: "<",
        });
        tools.push({
            name: "Redo (or Ctrl+y)(+Shift to redo 10 steps at a time)",
            color: "lightgray",
            //shortcutKey: "^up",
            click: function (ctrlKey, shiftKey) {
                redoBoardChange(shiftKey ? 10 : 1);
                drawBoard();
                return true;
            },
            draw: ">",
        });


        tools.push({
            name: "Auto-unshade",
            color: "lightgray",
            click: function () {
                registerBoardChange();
                toolClickAutoUnshade();

                drawBoard();
                return true;
            },
            draw: "//",
        });



        //tools.push({
        //    name: "Flip Horizontally (Ctrl+click for Vertically).  This will reset the Undo/Redo.",
        //    color: "lightgray",
        //    //shortcutKey: "^up",
        //    click: function (ctrlKey) {
        //        let boardCopy = getBoardCopy(board);
        //        for (let colIdx = 0; colIdx < COLS; colIdx++) {
        //            for (let rowIdx = 0; rowIdx < ROWS; rowIdx++) {
        //                if (ctrlKey) {
        //                    if (colIdx % 2 == 0) {
        //                        if (inBoard(colIdx, ROWS - rowIdx)) {
        //                            board[colIdx][rowIdx] = boardCopy[colIdx][ROWS - rowIdx];
        //                        }
        //                    } else {
        //                        if (inBoard(colIdx, ROWS - 1 - rowIdx)) {

        //                            board[colIdx][rowIdx] = boardCopy[colIdx][ROWS - 1 - rowIdx];
        //                        }
        //                    }
        //                } else {
        //                    board[colIdx][rowIdx] = boardCopy[COLS - 1 - colIdx][rowIdx];
        //                }
        //            }
        //        }
        //        drawBoard();
        //        importBoard();
        //    },
        //    draw: "><",
        //});

        //tools.push({
        //    name: "Placeholder",
        //    color: "lightgray",
        //    //shortcutKey: "^up",
        //    click: function () {
        //    },
        //    draw: "?",
        //});

        tools.push({
            name: "Clear shading",
            color: "lightgray",
            shortcutKey: "delete",
            click: function (ctrlKey) {
                registerBoardChange();
                for (var x = 0; x < COLS; ++x) {
                    for (var y = 0; y < ROWS; ++y) {
                        let cell = getBoardCell([x, y]);
                        if (cell && cell.hexTypeID > 0 && (cell.hexTypeID <= 3 || !cell.number)) {
                            setBoardHexType([cell.x, cell.y], 1);
                        }
                    }
                }
                checkAnswer();
                drawBoard();
                return true;
            },
            draw: "X",
        });
        tools.push({
            name: "Save changes to new tab/URL",
            color: "lightgray",
            //shortcutKey: "^up",
            click: function () {
                window.open("Sonari.html?boardDef=" + escape(getBoardDef()));
                return true;
            },
            draw: "⍈",
        });
        tools.push({
            name: solveMode ? "Edit mode" : "Solve mode",
            color: "lightgray",
            //shortcutKey: "^up",
            click: function () {
                toggleSolveMode();
                return true;
            },
            draw: function () {
                if (!solveMode) {
                    drawToolShadow(this);
                }
                drawString("✎", this.x + this.width / 2 - 8.5, this.y + 21.5, "black");
            }

        });

        tools.push({
            name: showClueLetters ? "Hide Clue Letters" : "Show Clue Letters",
            color: "lightgray",
            //shortcutKey: "^up",
            click: function () {
                showClueLetters = !showClueLetters;
                createTools();
                drawBoard();

                return true;
            },
            draw: function () {
                if (showClueLetters) {
                    drawToolShadow(this);
                }
                ctx.font = '12px sans-serif';
                drawString("ABC", this.x + this.width / 2 - 12.5, this.y + 18.5, "black");
                ctx.font = '20px sans-serif';

            }
        });

        tools.push({
            name: "First time? Watch an example video",
            color: "lightgray",
            //shortcutKey: "^up",
            click: function () {
                window.open("https://youtu.be/sjcfpVAKalI");
                return true;
            },
            draw: function () {
                ctx.font = '12px sans-serif';
                drawString("Help", this.x + this.width / 2 - 12.5, this.y + 18.5, "black");
                ctx.font = '20px sans-serif';
            }
        });

        for (var i = 4; i < (solveMode ? 11 : hexTypes.length); i++) {
            var shortcutKey = "key_" + hexTypes[i].name;
            if (shortcutKey)

                tools.push({
                    name: ["Mark cells with " + hexTypes[i].name, (solveMode ? "" : "(To make a clue, add color then number)")],// + " (" + i.toString() + ")",
                    hexType: i,
                    color: hexTypes[i].color,
                    symbol: hexTypes[i].symbol,
                    shortcutKey: hexTypes[i].shortcutKey,//"key_" + hexTypes[i].name,
                    click: function () {
                        currentHexType = this.hexType;
                        settingLabel = false;
                        drawBoard();
                        return true;
                    },
                    draw: function () {
                        if (currentHexType == this.hexType) {
                            drawToolShadow(this);
                        }
                        if (showClueLetters || this.hexType >= 11) {
                            drawString(this.symbol, this.x + this.width / 2 - 6.5, this.y + 21.5, "black");
                        }
                    }
                });
        }
        if (!solveMode) {

            tools.push({
                name: "Label clue with 1-2 characters ",//"Draw: " + hexTypes[i].name,// + " (" + i.toString() + ")",
                color: "lightgray",
                click: function () {
                    settingLabelLabel = prompt("Characters to display:", "?");
                    if (settingLabelLabel && settingLabelLabel.length > 2) {
                        alert("Please type 1 or 2 characters");
                        settingLabel = false;
                    } else if (!settingLabelLabel || settingLabelLabel.length == 0) {
                        settingLabel = false;
                    } else {
                        settingLabel = true;
                    }
                    drawBoard();
                    return true;
                },
                draw: function () {
                    if (settingLabel) {
                        drawToolShadow(this);
                    }
                    ctx.font = '16px sans-serif';
                    drawString("*>?", this.x + this.width / 2 - 12.5, this.y + 21.5, "black");
                    ctx.font = '20px sans-serif';
                }
            });
            tools.push({
                name: showLeftTriangles ? "Hide Left Triangle Clues" : "Show Left Triangle Clues",//"Draw: " + hexTypes[i].name,// + " (" + i.toString() + ")",
                color: "lightgray",
                click: function () {
                    showLeftTriangles = !showLeftTriangles;
                    showRightTriangles = false;
                    createTools();
                    drawBoard();

                    return true;
                },
                draw: function () {
                    if (showLeftTriangles) {
                        drawToolShadow(this);
                    }
                    drawString("◀", this.x + this.width / 2 - 8.5, this.y + 21.5, "black");
                }
            });
            tools.push({
                name: showRightTriangles ? "Hide Right Triangle Clues" : "Show Right Triangle Clues",//"Draw: " + hexTypes[i].name,// + " (" + i.toString() + ")",
                color: "lightgray",
                click: function () {
                    showRightTriangles = !showRightTriangles;
                    showLeftTriangles = false;
                    createTools();
                    drawBoard();

                    return true;
                },
                draw: function () {
                    if (showRightTriangles) {
                        drawToolShadow(this);
                    }
                    drawString("▶", this.x + this.width / 2 - 8.5, this.y + 21.5, "black");
                }
            });
        }

        //for (var i = 1; i <= 9; i++) {
        //    tools.push({
        //        name: "Number " + i + " (" + i.toString() + ")",
        //        color: "gray",
        //        symbol: i,
        //        shortcutKey: "key_" + i,
        //        click: function () {
        //            currentHexType = this.hexType;
        //            drawBoard();
        //        },
        //        draw: function () {
        //            if (currentHexType == this.hexType) {
        //                drawToolShadow(this);
        //            }
        //            drawString(this.symbol, this.x + this.width / 2 - 3.5, this.y + 3.5, "black");
        //        }
        //    });
        //}
        if (!solveMode) {

            tools.push({
                name: "Change board size",
                color: "lightgray",
                shortcutKey: "delete",
                click: function () {
                    let sidelen = prompt("(Warning: this will delete everything off the board)\nNew board side length (3-11):", Math.ceil(COLS / 2));
                    if (sidelen && Number.isInteger(Number(sidelen)) && Number(sidelen) >= 3 && Number(sidelen) <= 32) {
                        COLS = Number(sidelen) * 2 - 1;
                        ROWS = COLS;
                        resetBoard();
                        drawBoard();
                        colCellGroupsCoords = [];
                    }
                    return true;
                },
                draw: "⌬",
            });

            tools.push({
                name: ["Find a solution for shaded cells", "(Ctrl+click to check all possible solutions)"],
                color: "lightgray",
                click: function (ctrlKey, shiftKey) {
                    //populate all possibilities on the grid as display data.

                    registerBoardChange();
                    console.time("prep");

                    var starCount = 1;
                    if (starCount == "") return;
                    starCount = Number(starCount);
                    while (!Number.isInteger(starCount)) {
                        starCount = prompt("# of stars per line/region (Must be a number):");
                        if (starCount == "") return;
                        starCount = Number(starCount);
                    }

                    let verifyCount = 0;
                    let setCount = 0;
                    let revertCount = 0;
                    let finalCheckCount = 0;
                    let solBoardCount = 0;
                    let maxSolutionBoards = 50;

                    setStarBattleCellGroups(starCount);
                    var flatBoard = getBoardCopy();
                    let finalCheckGroups = getColCellGroups(flatBoard);

                    var solutionBoards = [];

                    let processingStartTime = Date.now();
                    let timeLimitExceeded = false;
                    let timelimit = 15000;

                    function starBattleSolver(flatBoard, cellList, startingIdx) {
                        //for each cell, 
                        //if cell has no number
                        //check if it's valid to set cell to 2 (ON).  AKA check for other cells on the axes with value 2.
                        //if it's valid, set cell = 2.  else set to 1 and move on.
                        //at the end, check if it's valid.  Should be able to just go through columns to check, as by definition others will be correct.  If not, return false and recurse.
                        //recurse: if it's good (aka all columns have exactly 2 stars), return true;
                        //else, set value to 1, then go on to the next X.
                        for (let i = startingIdx || 0, len = cellList.length; i < len; i++) {
                            var cell = cellList[i];
                            if (cell.hexTypeID == 1 || (cell.hexTypeID >= 4 && cell.hexTypeID <= 10 && !cell.number)) {
                                verifyCount++;

                                let isPossibleStar = true;
                                //let groupAvailability = [];
                                for (let group of cell.sudokuCellGroups) {
                                    //let availability = group.totalValue - getNumStarsInGroup(flatBoard, group.cellCoords);
                                    //  groupAvailability.push(availability);
                                    //if (availability < 1) {
                                    if (group.totalValue - getNumStarsInGroup(flatBoard, group.cellCoords) < 1) {

                                        isPossibleStar = false;
                                        break;
                                    }
                                }
                                if (isPossibleStar) {
                                    cell.hexTypeID = 3;

                                    setCount++;
                                    if (starBattleSolver(flatBoard, cellList, i + 1)) {
                                        return true;
                                    } else {
                                        cell.hexTypeID = 1;

                                        revertCount++;
                                        if (Date.now() - processingStartTime > timelimit) {
                                            if (timeLimitExceeded == false) {
                                                let addlSeconds = prompt((timelimit / 1000) + " second time limit exceeded.  How many more seconds do you want to give it?", "0");
                                                if (!isNaN(Number(addlSeconds)) && Number(addlSeconds) > 0) {
                                                    processingStartTime = Date.now();
                                                    timelimit = Number(addlSeconds) * 1000;
                                                } else {
                                                    timeLimitExceeded = true;
                                                    drawBoard();
                                                }
                                            }
                                            if (timeLimitExceeded) {
                                                return false;
                                            }
                                        }
                                        //if (shiftKey) {
                                        //    solutionBoards.push(JSON.stringify(flatBoard));
                                        //    return true;
                                        //}
                                    }
                                    //} else {
                                    //    cell.number = 1;
                                }
                            }
                        }

                        //todo: better final check, showing that every line in each direction do have exactly starCount stars.
                        //do final check that every star sees exactly N - 1 other stars.Surely there's a better way to do this, but oh well.
                        finalCheckCount++;
                        for (let group of finalCheckGroups) {
                            let hasCells = false;
                            let colStarCount = 0;
                            for (let cell of group) {
                                //if there are any cells, there must be starCount stars.
                                if (cell.hexTypeID > 0) {
                                    hasCells = true;
                                    if (cell.hexTypeID == 3) {
                                        colStarCount++;
                                    }
                                }
                            }
                            if (hasCells && colStarCount != starCount) {
                                return false;
                            }
                        }

                        //for (let i = 0, len = cellList.length; i < len; i++) {
                        //    var cell = cellList[i];
                        //    if (cell.hexTypeID > 0 && cell.number == 2) {
                        //        for (let group of cell.sudokuCellGroups) {
                        //            if (getNumStarsInGroup(flatBoard, group.cellCoords) + 1 != group.totalValue) {
                        //                return false;
                        //            }
                        //        }
                        //    }
                        //}

                        solBoardCount++;
                        solutionBoards.push(JSON.stringify(flatBoard));
                        if (!ctrlKey) {
                            return true;
                        } else {
                            if (solutionBoards.length >= maxSolutionBoards) {
                                //dedupe boards
                                solutionBoards = dedupeArray(solutionBoards);

                                //truly unique
                                if (solutionBoards.length >= maxSolutionBoards) {
                                    return true;
                                }
                            }
                        }
                    }


                    let cellList = [];
                    for (let i = 0; i < COLS; i++) {
                        for (let j = 0; j < ROWS; j++) {
                            let cell = flatBoard[i][j];
                            if (cell.hexTypeID > 0) {
                                cellList.push(cell);
                            }
                        }
                    }

                    //naively turn off cells that are already fulfilled.
                    let boardJSON = getBoardJSON();
                    let changed = false;
                    for (let group of finalCheckGroups) {
                        let colStarCount = 0;
                        for (let cell of group) {
                            //if there are any cells, there must be starCount stars.
                            if (cell.hexTypeID > 0) {
                                if (cell.hexTypeID == 3) {
                                    colStarCount++;
                                    for (let ncoords of getAllNeighborHexCoords([cell.x, cell.y])) {
                                        let c2 = getBoardCell(ncoords);
                                        if (c2 && c2.hexTypeID > 0) {
                                            c2.hexTypeID = 2;
                                            changed = true;
                                        }
                                    }
                                }
                            }
                        }
                        if (colStarCount == starCount) {
                            for (let cell of group) {
                                //if there are any cells, there must be starCount stars.
                                if (cell.hexTypeID == 1) {
                                    let c = getBoardCell([cell.x, cell.y]);
                                    c.hexTypeID = 2;
                                    changed = true;
                                }
                            }
                        }
                    }
                    if (changed) {
                        registerBoardChange(boardJSON);
                    }


                    //shuffleArray(cellList);

                    console.timeEnd("prep");
                    console.time("solve");
                    starBattleSolver(flatBoard, cellList);
                    if (timeLimitExceeded) {
                        return;
                    }
                    console.timeEnd("solve");
                    console.time("update");

                    //todo: reduce possible solutionboards - for some reason it's allowing duplicates.
                    //let jsonBoards = [];
                    //for (var sboard in solutionboards) {
                    //    jsonBoards = JSON.stringify(sboard);
                    //}
                    //solutionBoards = dedupeArray(jsonBoards);

                    let unpackedSolutionBoards = [];
                    for (var solBoard of solutionBoards) {
                        unpackedSolutionBoards.push(JSON.parse(solBoard));
                    }

                    if (solutionBoards.length && solutionBoards.length != maxSolutionBoards) {
                        for (let i = 0; i < COLS; i++) {
                            for (let j = 0; j < ROWS; j++) {
                                var cell = getBoardCell([i, j]);
                                if (cell && cell.hexTypeID > 0 && !cell.number) {
                                    var isAlwaysShaded = true;
                                    var isAlwaysUnshaded = true;
                                    for (let solBoard of unpackedSolutionBoards) {
                                        if (solBoard[i][j].hexTypeID == 3) {
                                            isAlwaysUnshaded = false;
                                        } else {
                                            isAlwaysShaded = false;

                                        }
                                    }
                                    if (isAlwaysShaded) {
                                        setBoardHexType([i, j], 3);
                                    } else if (isAlwaysUnshaded) {
                                        setBoardHexType([i, j], 2);
                                    }
                                }
                            }
                        }
                    }

                    console.timeEnd("update");

                    console.log("verifies:" + verifyCount);
                    console.log("sets:" + setCount);
                    console.log("reverts:" + revertCount);
                    console.log("final checks:" + finalCheckCount);
                    solBoardCount = solutionBoards.length;
                    console.log("solution board count:" + solBoardCount);

                    if (ctrlKey) {
                        console.log(solBoardCount + (solBoardCount == maxSolutionBoards ? "+" : "") + " solution(s)");
                        alert("This shaded cell layout has " + solBoardCount + (solBoardCount == maxSolutionBoards ? "+" : "") + " solution" + (solBoardCount == 1 ? "" : "s"));
                    } else {
                        if (solBoardCount == 0) {
                            alert("This shaded cell layout has 0 solutions");
                        }
                    }


                    drawBoard();
                    return true;
                },
                draw: "✓",
            });
        }
        //place shading tools just before undo/redo
        //        tools.push(tools.shift());
        //        tools.push(tools.shift());
        //        tools.push(tools.shift());

        let solvingTool = {
            name: "Solve: click to shade/unshade and modify ring sizes",
            color: solvingGradient,
            symbol: "",//"~",
            shortcutKey: "+`",
            click: function () {
                currentHexType = -1;
                drawBoard();
                return true;
            },
            draw: function () {
                if (currentHexType == -1) {
                    drawToolShadow(this);
                }
                drawString(this.symbol, this.x + this.width / 2 - 3.5, this.y + 21.5, "black");

                ctx.lineWidth = 2;
                ctx.strokeStyle = "crimson";
                setPathCoords(this.x + this.width / 10, this.y + this.height / 10, 10 / linelen);
                ctx.stroke();
                ctx.strokeStyle = "dodgerblue";
                setPathCoords(this.x + this.width / 2.3, this.y + this.height / 2.3, 6 / linelen);
                ctx.stroke();
                ctx.lineWidth = 1;

            }
        }
        tools.splice(8, 0, solvingTool);

        let toolRowCounts = [8, 8, 7];
        let toolRowBreak = toolRowCounts.shift() - 1;
        //layout tools in columnar grid.
        let toolX = toolBoxLeft;
        let toolY = toolMargin - .5;
        for (var i = 0; i < tools.length; i++) {
            var tool = tools[i];
            tool.height = toolHeight;
            tool.width = toolWidth;
            tool.x = toolX;
            tool.y = toolY;

            toolX += toolMargin + toolWidth;
            if (i == toolRowBreak) {
                toolX = toolBoxLeft;
                toolY += toolMargin + toolHeight;
                toolRowBreak += toolRowCounts.shift();
            }
        }

        ////layout tools in columnar grid.
        //for (var i = 0; i < tools.length; i++) {
        //    var tool = tools[i];
        //    tool.x = toolBoxLeft + (toolWidth + toolMargin) * (i % toolColumns);
        //    tool.y = toolMargin - .5 + (toolHeight + toolMargin) * (Math.floor(i / toolColumns));
        //    tool.height = toolHeight;
        //    tool.width = toolWidth;
        //}

        //create gradient for first tool, the solving tool.

        var solvingGradient = ctx.createLinearGradient(solvingTool.x,
            solvingTool.y,
            solvingTool.x + solvingTool.width,
            solvingTool.y + solvingTool.height);

        solvingGradient.addColorStop(.3, "#DEB887");
        solvingGradient.addColorStop(0.35, "#8b4513");
        solvingGradient.addColorStop(0.65, "#8b4513");
        solvingGradient.addColorStop(.7, "#FFFFFF");
        solvingTool.color = solvingGradient;

        //var descriptionTool = {
        //    name: "Description",
        //    color: "#DDDDDD",
        //    click: function () {
        //        var d = "~";
        //        var promptText = "Description";
        //        while (d.indexOf("~") > -1) {
        //            d = prompt(promptText, description);
        //            if (d == null) { return; }
        //            promptText = "Description (cannot contain '~'):";
        //        }
        //        registerBoardChange();
        //        description = d;
        //        drawBoard();
        //    },
        //    draw: function () {
        //        drawString(description, this.x + 1.5, this.y + 1.5, "black", null, this.width);
        //    },
        //    x: tools[0].x,
        //    y: tools[tools.length - 1].y + toolHeight + toolMargin,//toolMargin - .5,
        //    height: tools[tools.length - 1].y + toolHeight + .5,
        //    //width: canvasW - .5 - (toolWidth + toolMargin,
        //    width: canvasW - .5 - tools[0].x - toolMargin
        //}
        //tools.push(descriptionTool);

        let triClueRelativeSize = .5;
        //create triangular clue areas on the board.
        for (let i = 0; i < COLS; i++) {
            for (let j = 0; j < ROWS; j++) {
                let cell = board[i][j];
                if (cell && cell.hexTypeID > 0) {
                    //check if this has necessary neighbor cells.
                    let hasNeighbors = true;
                    let radius1CellCoords = getCellTriCoords(cell, 1, false);
                    for (let nCellCoords of radius1CellCoords) {
                        let nCell = getBoardCell(nCellCoords);
                        if (!nCell || nCell.hexTypeID == 0) {
                            hasNeighbors = false;
                            break;
                        }
                    }
                    if (hasNeighbors) {
                        let dcoords = getHexCenter(i, j);
                        tools.push({
                            name: "",
                            color: "lightgray",
                            //shortcutKey: "^up",
                            click: function () {
                                if (solveMode) {
                                    let hexTypeID = this.cell.rightTriClueColorID;
                                    if ((hexTypeID > 3 && this.cell.rightTriClueNumber)) {
                                        let maxRadius = getMaxRadius(hexTypeID);

                                        registerBoardChange();
                                        if (event.buttons == 2) {
                                            if (hexTypes[hexTypeID].radius > 0) {
                                                hexTypes[hexTypeID].radius--;
                                            } else {
                                                hexTypes[hexTypeID].radius = maxRadius;
                                            }
                                        } else {
                                            if (hexTypes[hexTypeID].radius < maxRadius) {
                                                hexTypes[hexTypeID].radius++;
                                            } else {
                                                hexTypes[hexTypeID].radius = 0;
                                            }
                                        }
                                        drawBoard();
                                        return true;
                                    } else {
                                        return false;
                                    }
                                } else if (showRightTriangles || this.cell.rightTriClueColorID > 1) {
                                    if (settingLabel && this.cell.rightTriClueColorID > 1 && this.cell.rightTriClueNumber) {
                                        registerBoardChange();
                                        this.cell.rightTriClueLabel = settingLabelLabel;
                                        settingLabel = false;
                                    } else if (currentHexType > 3 && currentHexType <= 10 && this.cell.rightTriClueColorID != currentHexType) {
                                        registerBoardChange();
                                        this.cell.rightTriClueColorID = currentHexType;
                                    } else if (currentHexType > 10) {
                                        if (this.cell.rightTriClueColorID > 1) {
                                            registerBoardChange();
                                            let newNumber = currentHexType - 11;
                                            if (newNumber == 0) {
                                                newNumber = 7;
                                            }
                                            if (this.cell.rightTriClueNumber == newNumber) {
                                                this.cell.rightTriClueNumber = 0;
                                                this.cell.rightTriClueLabel = "";
                                            } else {
                                                this.cell.rightTriClueNumber = newNumber;
                                                this.cell.rightTriClueLabel = "";
                                            }
                                        }
                                    } else {
                                        registerBoardChange();
                                        this.cell.rightTriClueColorID = 1;
                                        this.cell.rightTriClueNumber = 0;
                                        this.cell.rightTriClueLabel = "";
                                    }
                                    drawBoard();
                                    return true;
                                }
                            },
                            draw: function () {
                                if ((this.cell.rightTriClueColorID > 3 && this.cell.rightTriClueNumber) || (!solveMode && showRightTriangles)) {
                                    if (this.cell.rightTriClueColorID > 3 && this.cell.rightTriClueNumber) {
                                        ctx.strokeStyle = "black";
                                        ctx.lineWidth = 3;
                                        ctx.globalAlpha = 1;
                                    } else {
                                        ctx.strokeStyle = "gray";
                                        ctx.lineWidth = 1;
                                        ctx.globalAlpha = .3;
                                    }

                                    let hexType = hexTypes[this.cell.rightTriClueColorID];
                                    ctx.fillStyle = hexTypes[this.cell.rightTriClueColorID].color;
                                    ctx.beginPath();
                                    let triSidelen = this.width * 1.7 / 2;
                                    ctx.moveTo(this.x + this.width * 1.5, this.y + this.height / 2);

                                    ctx.lineTo(this.x, this.y + this.height / 2 - triSidelen);
                                    ctx.lineTo(this.x, this.y + this.height / 2 + triSidelen);
                                    ctx.closePath();
                                    ctx.fill();
                                    ctx.stroke();
                                    //ctx.fillStyle = "lime";
                                    //ctx.fillRect(this.x, this.y, this.width, this.height);

                                    if (this.cell.rightTriClueNumber) {
                                        //draw number
                                        ctx.font = linelen / 2 + 'px sans-serif';
                                        let s = this.cell.rightTriClueNumber % 7;
                                        if (this.cell.rightTriClueLabel != "") {
                                            s = this.cell.rightTriClueLabel;
                                        }
                                        drawString(s, Math.round(this.x + linelen / 16), Math.round(this.y + this.height / 2 + linelen / 6), "black");

                                        if (showClueLetters) {
                                            //draw colorblind-friendly letter.
                                            ctx.font = linelen / 3 + 'px sans-serif';
                                            drawString(hexType.symbol, Math.round(this.x + this.width - linelen * 2 / 9), Math.round(this.y + linelen * 3 / 8), "black");
                                        }
                                    }
                                    ctx.globalAlpha = 1;

                                }
                            },
                            x: dcoords[0] + linelen - (linelen * triClueRelativeSize) / 2,
                            y: dcoords[1] - (linelen * triClueRelativeSize) / 2,
                            height: linelen * triClueRelativeSize,
                            width: linelen * triClueRelativeSize,
                            color: "",
                            cell: cell,
                        });
                    }

                    //check on left as well
                    hasNeighbors = true;
                    radius1CellCoords = getCellTriCoords(cell, 1, true);
                    for (let nCellCoords of radius1CellCoords) {
                        let nCell = getBoardCell(nCellCoords);
                        if (!nCell || nCell.hexTypeID == 0) {
                            hasNeighbors = false;
                            break;
                        }
                    }
                    if (hasNeighbors) {
                        let dcoords = getHexCenter(i, j);
                        tools.push({
                            name: "",
                            color: "lightgray",
                            //shortcutKey: "^up",
                            click: function () {
                                if (solveMode) {
                                    let hexTypeID = this.cell.leftTriClueColorID;
                                    if ((hexTypeID > 3 && this.cell.leftTriClueNumber)) {
                                        let maxRadius = getMaxRadius(hexTypeID);

                                        registerBoardChange();
                                        if (event.buttons == 2) {
                                            if (hexTypes[hexTypeID].radius > 0) {
                                                hexTypes[hexTypeID].radius--;
                                            } else {
                                                hexTypes[hexTypeID].radius = maxRadius;
                                            }
                                        } else {
                                            if (hexTypes[hexTypeID].radius < maxRadius) {
                                                hexTypes[hexTypeID].radius++;
                                            } else {
                                                hexTypes[hexTypeID].radius = 0;
                                            }
                                        }
                                        drawBoard();
                                        return true;
                                    } else {
                                        return false;
                                    }
                                } else if (showLeftTriangles || this.cell.leftTriClueColorID > 1) {
                                    if (settingLabel && this.cell.leftTriClueColorID > 1 && this.cell.leftTriClueNumber) {
                                        registerBoardChange();
                                        this.cell.leftTriClueLabel = settingLabelLabel;
                                        settingLabel = false;
                                    } else if (currentHexType > 3 && currentHexType <= 10 && this.cell.leftTriClueColorID != currentHexType) {
                                        registerBoardChange();
                                        this.cell.leftTriClueColorID = currentHexType;
                                    } else if (currentHexType > 10) {
                                        if (this.cell.leftTriClueColorID > 1) {
                                            registerBoardChange();
                                            let newNumber = currentHexType - 11;
                                            if (newNumber == 0) {
                                                newNumber = 7;
                                            }
                                            if (this.cell.leftTriClueNumber == newNumber) {
                                                this.cell.leftTriClueNumber = 0;
                                                this.cell.leftTriClueLabel = "";
                                            } else {
                                                this.cell.leftTriClueNumber = newNumber;
                                                this.cell.leftTriClueLabel = "";
                                            }
                                        }
                                    } else {
                                        registerBoardChange();
                                        this.cell.leftTriClueColorID = 1;
                                        this.cell.leftTriClueNumber = 0;
                                        this.cell.leftTriClueLabel = "";
                                    }
                                    drawBoard();
                                    return true;
                                }
                            },
                            draw: function () {
                                if ((this.cell.leftTriClueColorID > 3 && this.cell.leftTriClueNumber) || (!solveMode && showLeftTriangles)) {
                                    if (this.cell.leftTriClueColorID > 3 && this.cell.leftTriClueNumber) {
                                        ctx.strokeStyle = "black";
                                        ctx.lineWidth = 3;
                                        ctx.globalAlpha = 1;
                                    } else {
                                        ctx.strokeStyle = "gray";
                                        ctx.lineWidth = 1;
                                        ctx.globalAlpha = .3;
                                    }

                                    let hexType = hexTypes[this.cell.leftTriClueColorID];
                                    ctx.fillStyle = hexTypes[this.cell.leftTriClueColorID].color;
                                    ctx.beginPath();
                                    let triSidelen = this.width * 1.7 / 2;
                                    ctx.moveTo(this.x - this.width * .5, this.y + this.height / 2);

                                    ctx.lineTo(this.x + this.width, this.y + this.height / 2 - triSidelen);
                                    ctx.lineTo(this.x + this.width, this.y + this.height / 2 + triSidelen);
                                    ctx.closePath();

                                    ctx.fill();
                                    ctx.stroke();
                                    //ctx.fillStyle = "yellow";
                                    //ctx.fillRect(this.x, this.y, this.width, this.height);

                                    if (this.cell.leftTriClueNumber) {
                                        //draw number
                                        ctx.font = linelen / 2 + 'px sans-serif';
                                        let s = this.cell.leftTriClueNumber % 7;
                                        if (this.cell.leftTriClueLabel != "") {
                                            s = this.cell.leftTriClueLabel;
                                        }
                                        drawString(s, Math.round(this.x + linelen / 6), Math.round(this.y + this.height / 2 + linelen / 6), "black");

                                        if (showClueLetters) {
                                            //draw colorblind-friendly letter.
                                            ctx.font = linelen / 3 + 'px sans-serif';
                                            drawString(hexType.symbol, Math.round(this.x + this.width - linelen * 4 / 8), Math.round(this.y + linelen * 3 / 8), "black");
                                        }
                                    }
                                    ctx.globalAlpha = 1;
                                }
                            },
                            x: dcoords[0] - linelen - (linelen * triClueRelativeSize) / 2,
                            y: dcoords[1] - (linelen * triClueRelativeSize) / 2,
                            height: linelen * triClueRelativeSize,
                            width: linelen * triClueRelativeSize,
                            color: "",
                            cell: cell,
                        });
                    }
                    //do it all again, but this time to face into the center of the hexes.
                    hasNeighbors = true;
                    radius1CellCoords = getCellTriCoords(cell, 1, false, true);
                    for (let nCellCoords of radius1CellCoords) {
                        let nCell = getBoardCell(nCellCoords);
                        if (!nCell || nCell.hexTypeID == 0) {
                            hasNeighbors = false;
                            break;
                        }
                    }
                    if (hasNeighbors) {
                        let dcoords = getHexCenter(i, j);
                        tools.push({
                            name: "",
                            color: "lightgray",
                            //shortcutKey: "^up",
                            click: function () {
                                if (solveMode) {
                                    let hexTypeID = this.cell.rightTriClue2ColorID;
                                    if ((hexTypeID > 3 && this.cell.rightTriClue2Number)) {
                                        let maxRadius = getMaxRadius(hexTypeID);

                                        registerBoardChange();
                                        if (event.buttons == 2) {
                                            if (hexTypes[hexTypeID].radius > 0) {
                                                hexTypes[hexTypeID].radius--;
                                            } else {
                                                hexTypes[hexTypeID].radius = maxRadius;
                                            }
                                        } else {
                                            if (hexTypes[hexTypeID].radius < maxRadius) {
                                                hexTypes[hexTypeID].radius++;
                                            } else {
                                                hexTypes[hexTypeID].radius = 0;
                                            }
                                        }
                                        drawBoard();
                                        return true;
                                    } else {
                                        return false;
                                    }
                                } else if (showLeftTriangles || this.cell.rightTriClue2ColorID > 1) {
                                    if (settingLabel && this.cell.rightTriClue2ColorID > 1 && this.cell.rightTriClue2Number) {
                                        registerBoardChange();
                                        this.cell.rightTriClue2Label = settingLabelLabel;
                                        settingLabel = false;
                                    } else if (currentHexType > 3 && currentHexType <= 10 && this.cell.rightTriClue2ColorID != currentHexType) {
                                        registerBoardChange();
                                        this.cell.rightTriClue2ColorID = currentHexType;
                                    } else if (currentHexType > 10) {
                                        if (this.cell.rightTriClue2ColorID > 1) {
                                            registerBoardChange();
                                            let newNumber = currentHexType - 11;
                                            if (newNumber == 0) {
                                                newNumber = 7;
                                            }
                                            if (this.cell.rightTriClue2Number == newNumber) {
                                                this.cell.rightTriClue2Number = 0;
                                                this.cell.rightTriClue2Label = "";
                                            } else {
                                                this.cell.rightTriClue2Number = newNumber;
                                                this.cell.rightTriClue2Label = "";
                                            }
                                        }
                                    } else {
                                        registerBoardChange();
                                        this.cell.rightTriClue2ColorID = 1;
                                        this.cell.rightTriClue2Number = 0;
                                        this.cell.rightTriClue2Label = "";
                                    }
                                    drawBoard();
                                    return true;
                                }
                            },
                            draw: function () {
                                if ((this.cell.rightTriClue2ColorID > 3 && this.cell.rightTriClue2Number) || (!solveMode && showLeftTriangles)) {
                                    if (this.cell.rightTriClue2ColorID > 3 && this.cell.rightTriClue2Number) {
                                        ctx.strokeStyle = "black";
                                        ctx.lineWidth = 3;
                                        ctx.globalAlpha = 1;
                                    } else {
                                        ctx.strokeStyle = "gray";
                                        ctx.lineWidth = 1;
                                        ctx.globalAlpha = .3;
                                    }

                                    let hexType = hexTypes[this.cell.rightTriClue2ColorID];
                                    ctx.fillStyle = hexTypes[this.cell.rightTriClue2ColorID].color;
                                    ctx.beginPath();
                                    let triSidelen = this.width * 1.7 / 2;
                                    ctx.moveTo(this.x - this.width * .5, this.y + this.height / 2);

                                    ctx.lineTo(this.x + this.width, this.y + this.height / 2 - triSidelen);
                                    ctx.lineTo(this.x + this.width, this.y + this.height / 2 + triSidelen);
                                    ctx.closePath();

                                    ctx.fill();
                                    ctx.stroke();
                                    //ctx.fillStyle = "yellow";
                                    //ctx.fillRect(this.x, this.y, this.width, this.height);

                                    if (this.cell.rightTriClue2Number) {
                                        //draw number
                                        ctx.font = linelen / 2 + 'px sans-serif';
                                        let s = this.cell.rightTriClue2Number % 7;
                                        if (this.cell.rightTriClue2Label != "") {
                                            s = this.cell.rightTriClue2Label;
                                        }
                                        drawString(s, Math.round(this.x + linelen / 6), Math.round(this.y + this.height / 2 + linelen / 6), "black");

                                        if (showClueLetters) {
                                            //draw colorblind-friendly letter.
                                            ctx.font = linelen / 3 + 'px sans-serif';
                                            drawString(hexType.symbol, Math.round(this.x + this.width - linelen * 4 / 8), Math.round(this.y + linelen * 3 / 8), "black");
                                        }
                                    }
                                    ctx.globalAlpha = 1;

                                }
                            },
                            x: dcoords[0] + linelen - (linelen * triClueRelativeSize) / 2,
                            y: dcoords[1] - (linelen * triClueRelativeSize) / 2,
                            height: linelen * triClueRelativeSize,
                            width: linelen * triClueRelativeSize,
                            color: "",
                            cell: cell,
                        });
                    }

                    //check on left as well
                    hasNeighbors = true;
                    radius1CellCoords = getCellTriCoords(cell, 1, true, true);
                    for (let nCellCoords of radius1CellCoords) {
                        let nCell = getBoardCell(nCellCoords);
                        if (!nCell || nCell.hexTypeID == 0) {
                            hasNeighbors = false;
                            break;
                        }
                    }
                    if (hasNeighbors) {
                        let dcoords = getHexCenter(i, j);
                        tools.push({
                            name: "",
                            color: "lightgray",
                            //shortcutKey: "^up",
                            click: function () {
                                if (solveMode) {
                                    let hexTypeID = this.cell.leftTriClue2ColorID;
                                    if ((hexTypeID > 3 && this.cell.leftTriClue2Number)) {
                                        let maxRadius = getMaxRadius(hexTypeID);

                                        registerBoardChange();
                                        if (event.buttons == 2) {
                                            if (hexTypes[hexTypeID].radius > 0) {
                                                hexTypes[hexTypeID].radius--;
                                            } else {
                                                hexTypes[hexTypeID].radius = maxRadius;
                                            }
                                        } else {
                                            if (hexTypes[hexTypeID].radius < maxRadius) {
                                                hexTypes[hexTypeID].radius++;
                                            } else {
                                                hexTypes[hexTypeID].radius = 0;
                                            }
                                        }
                                        drawBoard();
                                        return true;
                                    } else {
                                        return false;
                                    }
                                } else if (showRightTriangles || this.cell.leftTriClue2ColorID > 1) {
                                    if (settingLabel && this.cell.leftTriClue2ColorID > 1 && this.cell.leftTriClue2Number) {
                                        registerBoardChange();
                                        this.cell.leftTriClue2Label = settingLabelLabel;
                                        settingLabel = false;
                                    } else if (currentHexType > 3 && currentHexType <= 10 && this.cell.leftTriClue2ColorID != currentHexType) {
                                        registerBoardChange();
                                        this.cell.leftTriClue2ColorID = currentHexType;
                                    } else if (currentHexType > 10) {
                                        if (this.cell.leftTriClue2ColorID > 1) {
                                            registerBoardChange();
                                            let newNumber = currentHexType - 11;
                                            if (newNumber == 0) {
                                                newNumber = 7;
                                            }
                                            if (this.cell.leftTriClue2Number == newNumber) {
                                                this.cell.leftTriClue2Number = 0;
                                                this.cell.leftTriClue2Label = "";
                                            } else {
                                                this.cell.leftTriClue2Number = newNumber;
                                                this.cell.leftTriClue2Label = "";
                                            }
                                        }
                                    } else {
                                        registerBoardChange();
                                        this.cell.leftTriClue2ColorID = 1;
                                        this.cell.leftTriClue2Number = 0;
                                        this.cell.leftTriClue2Label = "";
                                    }
                                    drawBoard();
                                    return true;
                                }
                            },
                            draw: function () {
                                if ((this.cell.leftTriClue2ColorID > 3 && this.cell.leftTriClue2Number) || (!solveMode && showRightTriangles)) {
                                    if (this.cell.leftTriClue2ColorID > 3 && this.cell.leftTriClue2Number) {
                                        ctx.strokeStyle = "black";
                                        ctx.lineWidth = 3;
                                        ctx.globalAlpha = 1;
                                    } else {
                                        ctx.strokeStyle = "gray";
                                        ctx.lineWidth = 1;
                                        ctx.globalAlpha = .3;
                                    }

                                    let hexType = hexTypes[this.cell.leftTriClue2ColorID];
                                    ctx.fillStyle = hexTypes[this.cell.leftTriClue2ColorID].color;
                                    ctx.beginPath();
                                    let triSidelen = this.width * 1.7 / 2;
                                    ctx.moveTo(this.x + this.width * 1.5, this.y + this.height / 2);

                                    ctx.lineTo(this.x, this.y + this.height / 2 - triSidelen);
                                    ctx.lineTo(this.x, this.y + this.height / 2 + triSidelen);
                                    ctx.closePath();
                                    ctx.fill();
                                    ctx.stroke();
                                    //ctx.fillStyle = "lime";
                                    //ctx.fillRect(this.x, this.y, this.width, this.height);

                                    if (this.cell.leftTriClue2Number) {
                                        //draw number
                                        ctx.font = linelen / 2 + 'px sans-serif';
                                        let s = this.cell.leftTriClue2Number % 7;
                                        if (this.cell.leftTriClue2Label != "") {
                                            s = this.cell.leftTriClue2Label;
                                        }
                                        drawString(s, Math.round(this.x + linelen / 16), Math.round(this.y + this.height / 2 + linelen / 6), "black");

                                        if (showClueLetters) {
                                            //draw colorblind-friendly letter.
                                            ctx.font = linelen / 3 + 'px sans-serif';
                                            drawString(hexType.symbol, Math.round(this.x + this.width - linelen * 2 / 9), Math.round(this.y + linelen * 3 / 8), "black");
                                        }
                                    }
                                    ctx.globalAlpha = 1;
                                }
                            },
                            x: dcoords[0] - linelen - (linelen * triClueRelativeSize) / 2,
                            y: dcoords[1] - (linelen * triClueRelativeSize) / 2,
                            height: linelen * triClueRelativeSize,
                            width: linelen * triClueRelativeSize,
                            color: "",
                            cell: cell,
                        });
                    }
                }
            }
        }


        for (var i = 0; i < tools.length; i++) {
            var tool = tools[i];
            addMouseOverText(tool.name, "tool", tool.x, tool.y, tool.x + tool.width, tool.y + tool.height);
        }
    }
    //createTools();
    function promptDescription() {
        var d = "~";
        var promptText = "Description";
        while (d.indexOf("~") > -1) {
            d = prompt(promptText, description);
            if (d == null) { return; }
            promptText = "Description (cannot contain '~'):";
        }
        registerBoardChange();
        description = d;
        $("#hTitle").text(description);
        drawBoard();
    }
    //check if there's a board Def in the URL
    const urlParams = new URLSearchParams(window.location.search);
    let boardDef = urlParams.get('boardDef')
    //if (!boardDef) {
    ////get it from local storage.
    ////boardDef = window.localStorage.getItem("boardDef");
    //    //boardDef = boardDef.replace(/B/ig, 'A');
    //    //2977 2-star! 
    //    boardDef = "32~Untitled~[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]~...............................A;.............................AAAAC;...........................CAACAAAAA;.........................AAAAAAACACAAA;.......................AAAAAAAAAAAAAAACA;.....................CAAAAAAACAAAAAAAAAAAA;...................AAAAAAAAAAAAAAAAAAAAAAAAA;.................AAAAAAACAAACAAAAAAACAAAAAAAAA;...............AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA;.............AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA;...........AAAAAAAAAAAACAACAAAAAAAAAAAAAAAAAACAAAAAA;.........AAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAA;.......AAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAA;.....AAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAA;...AAAAAAAAAAAAAAAACAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAA;.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAA;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAACAAAAAAACAAAAAAAAAAAAAAAAAA;CACAAAAAAAAAAAAAAAAACAACAAAAAAAAAAACAAAAAAAAAAAACAAAAAAAAAAAAAA;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAA;AAAAAAAAAACAAAAAAAAAACAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAACACAAAAAA;ACACAAAAAAAAAAACAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAA;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAACAAAAAAAAACA;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAA;AAAACAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAA;AAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAA;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA;AAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA;AAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAACAAAA;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAACAAAAAAAAAAAA;ACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA;AAAAAACAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAACAAA;AACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAA;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAACAAAAAAACAA;AAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAA;CAACAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA;AAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAA;AAAAAAAAAAAAACAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAA;AAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA;AAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAA;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA;AAAACAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA;AAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAC;AAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA;AAAAAACAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAA;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAACAAACAAACAAACAAACAAACAAA;AAAAAAAAACAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC;AAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAACAAACAAACAAACAAACAAACAAACA;..AAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAA;....AAAAAAAACAAAAACAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA;......AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAA;........AAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAA;..........CAAACAACACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA;............AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA;..............AACAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAA;................AAAAAAAAAACAAAAAAAAAAAAAAAAACAA;..................AAAAAAAAAAAAAAAAAAAAAAAAACA;....................AAAAAAAAAAAAACAAAAAAAAA;......................AACAACAAAAAAAAAAAAA;........................AAAAAAAAAAAAAAA;..........................AAAAAAAAAAA;............................ACAAAAA;..............................AAA"
    //    //blanked out, so we can make a third pass for 3-star starbattle:
    //    //boardDef = "32~Untitled~[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]~...............................A;.............................BBBBB;...........................BBBBBBBBB;.........................ABBBABBBBBBAB;.......................AAAAAABAABABAABBB;.....................BBAAAAABBBAAAAAAABAAA;...................ABBBBBBABBBBAAAABBBAAAAAA;.................AAAAAABBBABBBAAAAABBBAAAAAAAA;...............AAAAAAAAABAAABAAAAAAABAAAAAAAAAAA;.............AAAAAAAAAABABBBAAAAAAAAAAAAAAAAABAAAA;...........AAAAAAAAAAABBBBBBAAABAAAAAAAAAAAABBBAAAAA;.........AAAAAAAAAAAAABBBABAAABBBAAAABAAAAAABBBAAAAAAA;.......AAAAAAAAAAAAAAAAAABAAAABBBAAABBBAAAAAAAABAAAAAAAA;.....AAAAAAAAAAAAAABABBBBBBAAAAAAAAABBBAAAAAAABBBAABBBAAAA;...AAAAAAAAAAAAAAABBBBBBBBBAAAAAAAAAAAAAAAAAAABBBAABBBAAABBB;.AAAAAAAAAAAAAAAAABBBABAAAAAAAABBBABBBAAAAABBBAAAAAABAAAABBBAA;BBBBAAAAAAAAAAAAAAABBBABAAAAAAABBBABBBAAAAABBBABBBAAAAAAAABAAAA;BBBBAAAAAAAAAAAAAAABBBBBBAAAAAAABABBBAAAABAABAABBBAAAAAAAAAAAAA;BABAAAAAABBBAAAAAAAABBBBBAAAAAAAABBBBAAABBBAAAAABAAAABBBBBAAAAA;ABABAAAAABBBAAABABBBBBBAAAAAAAAAABBBAAAABBBAAAAAAAAAABBBBBABBBA;BBBBBAAAAABAAABBBBBBBBBAAAAAAAAAAABAAAAAAAAAAAAAAAAAAABABAABBBA;BBBBBAAAAAAAAABBBABAAAAAAAAAAAAAAAAAAAAAABBBAAAAAAABAAAAAAAABBA;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBBABBBAAAAAABBBAAAAAAABBB;AAABBBABAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBBAABAAAAAAABBBAABBBAABBB;AAABBBBBBAAAAAAAAAAAAAAAABAAAAAAAAAAAABBBBAAAAAAAAAAAAABBBAAAAA;AAAABABBBAAAAAAAAAAAAAAABBBAAAAAAAAAAAABBBAAAAAAAAAAAAAABAAAAAA;AAAAABAAAAAAAAAAAAAAAAAABBBAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAA;AAAABBBBBBAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBBAAAAAAAAAAAAAAABBBAAA;AAAABBBBBBAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBBAAAAAAABBBAAAAABBBAAA;ABAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBBAAAAAAAABBBAAAAAABAAAA;BBBAABBBABAAAAAAAAAAAAAAAAAAAAAAAAAAAABBBAAAAAAAABBBAAAAAAABAAA;BBBBABBBBBBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBBABBBAAAAAABBBAA;ABBBAABABBBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBBABBBAABBBBAAAABBBBA;AABAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBBAABBBBABBBAAAAABBBA;BBABAAABAABBBAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAABBBAABAAAAAAABAA;BBBBBABBBABBBBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAABAAAAA;BABBBABBBAABBBAAAAAAAAAAAAABBBAAAAAAAAAAAAAAABBBAAAAAAAABBBAAAA;AAAAABAAAAAABBBAAAAAAAAAAAABBBAAAAAAAAAAAAAAABBBAAAAAAAABBBAAAA;AAAABBBAAAAABBBBAAAAAAAAAAAABAAAAAAAAAAAAAAAAABAAAAAAAABAAAAAAA;AAAABBBAAAAAABBBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBBAAAAAA;AAABBBABBBAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBBAAAAAA;AAABBBABBBAAAAABBBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBBAAAAABB;AAAABAAABAABAAABBBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBBAAAAABB;AAAAABBBAABBBAABBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBAAAAAAAB;AAAAABBBAABBBABBBAAAAAAAAAAAAAAAAAABAAABAAABAAABAAABBBBBAAABAAA;AAAAAABAABAAABBBBAAAAAAAAAAAAAAAAABBBABBBABBBABBBABBBBBBBABBBBB;AAAAAAAABBBABBBAABAAAAAAAAAAAAAAAABBBBBBBBBBBBBBBBBBBBBBBBBBBBB;AAAAAAAABBBABBBABBBAAAAAAAAAAAABAAAABBBABBBABBBABBBABBBABBBABBB;..AAAAAAAAABBBAABBBBABBBAAAAAABBBAAABBBABBBABBBABBBABBBABBBAB;....AAAAAAABBBAAABBBABBBAAAAAABBBAAAAAAAAAAAAAAAABAAAAAAAAA;......AAAAAABAAAAABAAABAAAAAABBBAAAAAAAAAAAAAAAABBBAAAAAA;........ABBBABBBABABAAAAAAAAABBBAAAAAAAAAAAAAAAABBBAAAA;..........BBABBBBBBBBAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAA;............AABBBBBBBBAAAAAAAAAAAAAAAAAAAAAAAAAAAAA;..............ABBBABBBAAABBBAAAAAAAAAAAAAAABBBAAA;................BAAABAAAABBBAAAAAAAAAAAAAAABBBA;..................AAAAAAAABAAAAAABAAAAAAAABBB;....................AAABBBABAAAABBBAAAAAAAB;......................ABBBBBBAAABBBAAAAAA;........................BABBBAAAAAAAAAA;..........................AAABAAAAAAA;............................BBBAAAA;..............................BAA"

    //}
    if (boardDef) {
        //$("#txtBoardDefinition").val(boardDef);
        importBoard();
    } else {
        resetBoard();
        drawBoard();
    }

    //$('#btnImport').click(importBoard);
    $('#hTitle').click(promptDescription);
});

