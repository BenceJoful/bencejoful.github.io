'use strict';
$(document).ready(function () {

    class Cell {
        hexTypeID = 0;
        number = 0;
        sudokuCellGroups = [];
        x = 0;
        y = 0;
        constructor(x, y, hexTypeID, number, sudokuCellGroups) {
            this.x = x;
            this.y = y;
            this.hexTypeID = hexTypeID;
            this.number = number;
            this.sudokuCellGroups = sudokuCellGroups;
        }
    }
    function getCellClone(cell) {
        return new Cell(cell.x, cell.y, cell.hexTypeID, cell.number, cell.sudokuCellGroups);
    }
    function getDrawCoords(x, y, overX) {
        if (typeof overX == "undefined") overX = x;
        var drawY = HEX_H * y;
        var drawX = HEX_W * x;
        if (overX % 2) {
            drawY += HEX_H / 2;
        }
        return [drawX, drawY];
    };

    function getHexCenter(x, y) {
        var drawCoords = getDrawCoords(x, y);
        return [drawCoords[0] + HEX_W * .65, drawCoords[1] + HEX_H / 2];
    };

    function setPathCoords(x, y, percent) {
        if (percent == undefined) percent = 1;
        ctx.beginPath();
        for (var i = 0; i < 6; i++) {
            ctx.lineTo(x + HEX_PATH[i][0] * percent, y + HEX_PATH[i][1] * percent); // no need to moveTo first, since the initial lineTo is treated as a moveTo.
        }
        ctx.closePath();
    };
    function setPath(x, y) {
        var drawCoords = getDrawCoords(x, y);
        setPathCoords(drawCoords[0], drawCoords[1]);
    };

    function drawBlock(x, y, fillStyle, offsetX, offsetY, stroke) {
        // draw a single hex at (x, y)
        if (x < 0 || y < 0) return;
        if (offsetX === undefined) offsetX = 0;
        if (offsetY === undefined) offsetY = 0;
        var drawCoords = getDrawCoords(x, y);
        drawBlockCoords(drawCoords[0] + offsetX, drawCoords[1] + offsetY, fillStyle, stroke);

        return drawCoords;
    };
    function drawBlockCoords(x, y, fillStyle, stroke) {
        setPathCoords(x, y);
        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }
        if (stroke) {
            ctx.stroke();
        }
    }
    function resetLayer(layerIdx) {
        for (var x = 0; x < COLS; ++x) {
            board[layerIdx][x] = [];
            for (var y = 0; y < ROWS; ++y) {
                setBoardHexType([x, y], layerIdx, 0);
            }
        }
    }

    function resetBoard() {
        board = [];
        for (var i = 0; i < LAYERCNT; i++) {
            board.push([]);
            resetLayer(i);
        }
        description = "Untitled";
        setCurrentLayerIdx(LAYERCNT - 1);
        undoboards = [];
        redoboards = [];
        resetBoardDisplay();

    }
    function resetBoardDisplay() {
        boardDisplay = [];
        for (var x = 0; x < COLS; ++x) {
            boardDisplay[x] = [];
            for (var y = 0; y < ROWS; ++y) {
                boardDisplay[x][y] = "";
            }
        }
    }
    function setCurrentLayerIdx(idx) {
        if (idx >= 0 && idx < LAYERCNT) {
            currentLayerIdx = idx;
            $('#inputActiveLayer').val(idx + 1);
            drawBoard();
        }
    }

    function importBoard() {
        var levelText = $("#txtBoardDefinition").val();
        var layerTexts = levelText.split("~");
        resetBoard();
        currentLayerIdx = 0;
        description = layerTexts.shift();
        if (layerTexts[0][0] == '[') {
            thermos = JSON.parse(layerTexts.shift());
        } else {
            thermos = [];
        }
        for (var iLayer = 0; iLayer < layerTexts.length; iLayer++) {
            var lines = layerTexts[iLayer].replace(/\./g, "@").split(";");
            //for each line, get the first 4 characters, convert to integer, put it in board.
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].split("");
                for (var j = 0; j < line.length; j++) {
                    if (inBoard(j, i)) {
                        var lineVal = line[j];
                        if (Number.isInteger(Number(lineVal))) {
                            setBoardNumber([j, i], iLayer, Number(lineVal));
                            line.splice(j, 1);
                            j--;
                        } else {
                            var boardvalue = lineVal.charCodeAt(0) - 64;
                            setBoardHexType([j, i], iLayer, boardvalue);
                            if (boardvalue > 0 && iLayer > currentLayerIdx) {
                                currentLayerIdx = iLayer;
                            }
                        }
                    }
                }
            }
        }
        setCurrentLayerIdx(currentLayerIdx);
    }
    function drawBoard() {

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        layerWarnings = [];

        //clear out mouseovers that were here before.
        for (var i = mouseOverTexts.length - 1; i >= 0; i--) {
            if (mouseOverTexts[i].type != "tool") {
                mouseOverTexts.splice(i, 1);
            }
        }
        var topLayerToDraw = LAYERCNT;
        if (!showAllLayers) {
            topLayerToDraw = currentLayerIdx;
        }

        var minimapXOff = descriptionTool.x;
        var minimapYOff = canvas.height - toolMargin;//decrements for each layer.
        var minimapHeight = 6;
        var minimapWidth = minimapHeight * 13 / 15;
        var blocksAtCoords = [];

        let displayXV = false;
        let xCounter = 0;
        let vCounter = 0;
        let thermoLengths = [];
        let displayThermoThreshhold = 0;
        let localmaxima = 0;
        let drawStrings = [];
        let displaySlingshots = false;
        let slingshotCount = 0;
        let slingshotCounts = [];
        let displayAdjacent = true;
        let displayCloneRegions = false;

        for (var iLayer = LAYERCNT - 1; iLayer >= 0; iLayer--) {
            var filledBlocks = [];
            var minX = COLS;
            var minY = ROWS;
            var maxX = 0;
            var maxY = 0;
            for (var x = 0; x < board[iLayer].length; ++x) {
                for (var y = 0; y < board[iLayer][x].length; ++y) {
                    var hexTypeID = board[iLayer][x][y].hexTypeID;
                    if (hexTypeID == 0) {
                        if (iLayer == LAYERCNT - 1) {
                            //draw the background blocks "transparent"
                            drawBlock(x, y, hexTypes[hexTypeID].color, null, null, true);
                        }
                    } else {
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
                    }
                }
            }

            if (iLayer <= topLayerToDraw) {
                // stroke the filled blocks with a shadow.
                ctx.shadowBlur = 3;
                ctx.lineWidth = 3;
                for (var i = 0; i < filledBlocks.length; i++) {
                    var x = filledBlocks[i][0];
                    var y = filledBlocks[i][1];
                    let coveredBlockHexTypeIDs = blocksAtCoords[encodeCoords([x, y])];
                    if (coveredBlockHexTypeIDs) {
                        //draw notice that this block covers others (is in groups).
                        ctx.shadowBlur = 0;
                        ctx.lineWidth = 3;
                        ctx.fillStyle = "black";
                        let drawCoords = getDrawCoords(x, y);
                        for (let i = 0; i < coveredBlockHexTypeIDs.length; i++) {
                            ctx.fillRect(drawCoords[0] + HEX_W / 3 + i * 5, drawCoords[1] + 2, 4, 4)
                        }
                        ctx.fillStyle = hexTypes[board[iLayer][x][y].hexTypeID].color;
                        for (let i = coveredBlockHexTypeIDs.length - 1; i >= 0; i--) {
                            ctx.fillRect(drawCoords[0] + HEX_W / 3 + .5 + i * 5, drawCoords[1] + 2.5, 3, 3)
                            ctx.fillStyle = hexTypes[coveredBlockHexTypeIDs[i]].color;
                        }
                        blocksAtCoords[encodeCoords([x, y])].push(board[iLayer][x][y].hexTypeID);
                    }
                    if (!coveredBlockHexTypeIDs || iLayer == currentLayerIdx) {
                        //draw block shadow, preparing for real block next.
                        if (iLayer == currentLayerIdx) {
                            ctx.strokeStyle = "red";
                        }
                        drawBlock(x, y, null, null, null, true);
                    }
                }
                ctx.shadowBlur = 0;
            }

            if (filledBlocks.length > 0) {
                minimapYOff -= (maxY - minY + 2) * minimapHeight;
                var localMinimapXOff = minimapXOff - minimapWidth * minX;
                var localMinimapYOff = minimapYOff - minimapHeight * minY;

                // fill the filled blocks.  This is only garunteed to draw over the current block, and may be drawn over by future blocks.
                //todo: only draw filled blocks in the highest visible layer, don't waste time drawing below that.

                for (var i = 0; i < filledBlocks.length; i++) {
                    var x = filledBlocks[i][0];
                    var y = filledBlocks[i][1];
                    var cell = board[iLayer][x][y];
                    var hexTypeID = cell.hexTypeID;
                    var hexType = hexTypes[hexTypeID];
                    if (iLayer <= topLayerToDraw && !blocksAtCoords[encodeCoords([x, y])]) {
                        blocksAtCoords[encodeCoords([x, y])] = [cell.hexTypeID];

                        var coords = drawBlock(x, y, hexType.color);
                        var displayValue = "";
                        if (cell.number) {
                            displayValue = cell.number.toString();
                            if (boardDisplay[x][y]) {
                                displayValue += ": " + boardDisplay[x][y];
                            }
                            if (displayXV) {
                                //check neighbors for XV, draw them.
                                for (let neighborcoords of getAllNeighborHexCoords([x, y])) {
                                    let neighborcell = board[iLayer][neighborcoords[0]][neighborcoords[1]];
                                    if (neighborcell && neighborcell.number) {
                                        if (neighborcell.number + cell.number == 10) {
                                            let [neighborcoordsX, neighborcoordsY] = getDrawCoords(neighborcoords[0], neighborcoords[1]);
                                            neighborcoordsX = coords[0] * .5 + neighborcoordsX * .5;
                                            neighborcoordsY = coords[1] * .5 + neighborcoordsY * .5;
                                            drawStrings.push(["X", Math.round(neighborcoordsX) + 10, Math.round(neighborcoordsY + 6), "black"]);
                                            xCounter++;
                                        }
                                        if (neighborcell.number + cell.number == 5) {
                                            let [neighborcoordsX, neighborcoordsY] = getDrawCoords(neighborcoords[0], neighborcoords[1]);
                                            neighborcoordsX = coords[0] * .5 + neighborcoordsX * .5;
                                            neighborcoordsY = coords[1] * .5 + neighborcoordsY * .5;
                                            drawStrings.push(["V", Math.round(neighborcoordsX) + 10, Math.round(neighborcoordsY + 6), "black"]);
                                            vCounter++;
                                        }
                                    }
                                }
                            }
                        } else {
                            displayValue = boardDisplay[x][y];
                        }

                        drawStrings.push([displayValue.substr(0, 3), Math.round(coords[0]) + 10, Math.round(coords[1] + 6), "black"]);

                        addMouseOverText(hexType.name + " (" + x + "," + y + "): " + boardDisplay[x][y], "board", coords[0] + 6, coords[1] + 3, coords[0] + 5 + 16, coords[1] + 3 + 16);
                        //draw bounding box:
                        //ctx.shadowBlur = 0; ctx.lineWidth = 1; ctx.strokeRect(coords[0] + 5, coords[1] + 3, 16, 16);
                    }

                    //draw miniature versions over near the tools.
                    ctx.fillStyle = hexType.color;
                    setPathCoords(localMinimapXOff + x * minimapWidth, localMinimapYOff + (x % 2 == 1 ? minimapHeight / 2 : 0) + y * minimapHeight, minimapHeight / HEX_H);
                    ctx.fill();
                }

                //draw extra info on top.  This will go over all blocks regardless of position.
                if (displayThermoThreshhold) {
                    for (var i = 0; i < filledBlocks.length; i++) {
                        var cell = board[iLayer][filledBlocks[i][0]][filledBlocks[i][1]];
                        //if (iLayer <= topLayerToDraw) {

                        if (cell.number > 0 && cell.number < 3 && cell.x != undefined) {
                            //draw potential thermos.  start only on 1, but recurse.
                            //todo: keep track of all possible thermos.  At the end, for each cell, find the longest possible thermo it is a part of, and draw it on the board.
                            //or, for each cell, build longest possible thermo. starting at N, go up by 1 at a time until you reach 9.  go ahead and branch if necessary.
                            ////go in each direction until you run out of numbers (down to 1, up to 9.)

                            //if (cell.number == 1) {
                            let cells = [];
                            cells.push([cell, 1]);
                            let cellIdx = 0;
                            let lines = [];
                            while (cellIdx < cells.length) {
                                //get seed, get seed number N, draw line toward adjacent cells whose number is N+1.  push that cell as seed.
                                let [nextCell, thermoLength] = cells[cellIdx];
                                cellIdx++;
                                let closestNeighborsHigh = [];

                                for (let neighborcoords of getAllNeighborHexCoords([nextCell.x, nextCell.y])) {
                                    let neighborcell = board[iLayer][neighborcoords[0]][neighborcoords[1]];
                                    if (neighborcell.number > 0) {
                                        let diff = neighborcell.number - nextCell.number;
                                        if (diff > 0) {
                                            if (closestNeighborsHigh.length == 0 || closestNeighborsHigh[0].number > neighborcell.number) {
                                                closestNeighborsHigh = [neighborcell];
                                            } else if (closestNeighborsHigh[0].number == neighborcell.number) {
                                                closestNeighborsHigh.push(neighborcell);
                                            }
                                        }

                                        //let diff = Math.abs(nextCell.number - neighborcell.number);
                                        //if (diff >= 1) {// || diff == 2) {
                                        //    if (neighborcell.number > nextCell.number) {
                                        //        cells.push([neighborcell, thermoLength + 1]);

                                        //        let [neighborcoordsX, neighborcoordsY] = getDrawCoords(neighborcoords[0], neighborcoords[1]);
                                        //        let [mycoordsX, mycoordsY] = getDrawCoords(nextCell.x, nextCell.y);
                                        //        mycoordsX = mycoordsX + HEX_W / 2 + 2;
                                        //        mycoordsY = mycoordsY + HEX_H / 2;
                                        //        neighborcoordsX = neighborcoordsX + HEX_W / 2 + 2;
                                        //        neighborcoordsY = neighborcoordsY + HEX_H / 2;
                                        //        lines.push([mycoordsX, mycoordsY, neighborcoordsX, neighborcoordsY]);
                                        //    }
                                        //}
                                    }
                                }
                                let [mycoordsX, mycoordsY] = getHexCenter(nextCell.x, nextCell.y);
                                for (let neighborcell of closestNeighborsHigh) {
                                    let [neighborcoordsX, neighborcoordsY] = getHexCenter(neighborcell.x, neighborcell.y);
                                    let colorI = (nextCell.number - 1) * 255 / 9;
                                    lines.push(
                                        [mycoordsX,
                                            mycoordsY,
                                            neighborcoordsX,
                                            neighborcoordsY,
                                            "rgba(" + (255 - colorI) + "," + (255 - colorI) + "," + (255 - colorI) + "," + (1 - (nextCell.number / 30)) + ")"]
                                    );

                                    //ctx.strokeStyle = "rgba(" + (255 - colorI) + "," + (255 - colorI) + "," + (255 - colorI) + "," + (1 - (nextCell.number / 30)) + ")";
                                    //ctx.lineWidth = 2;
                                    //ctx.beginPath();
                                    //ctx.moveTo(mycoordsX + HEX_W / 2 + 2, mycoordsY + HEX_H / 2);
                                    //ctx.lineTo(neighborcoordsX + HEX_W / 2 + 2, neighborcoordsY + HEX_H / 2);
                                    //ctx.stroke();
                                    drawString(neighborcell.number.toString(), Math.round(neighborcoordsX) + 10, Math.round(neighborcoordsY + 6), "black");
                                    cells.push([neighborcell, thermoLength + 1]);
                                }

                                //for (let neighborcoords of getAllNeighborHexCoords([nextCell.x, nextCell.y])) {
                                //    let neighborcell = board[iLayer][neighborcoords[0]][neighborcoords[1]];
                                //    if (neighborcell.number > 0) {
                                //        let diff = Math.abs(nextCell.number - neighborcell.number);
                                //        if (diff >= 1) {// || diff == 2) {
                                //            if (neighborcell.number > nextCell.number) {
                                //                cells.push([neighborcell, thermoLength + 1]);

                                //                let [neighborcoordsX, neighborcoordsY] = getDrawCoords(neighborcoords[0], neighborcoords[1]);
                                //                let [mycoordsX, mycoordsY] = getDrawCoords(nextCell.x, nextCell.y);
                                //                mycoordsX = mycoordsX + HEX_W / 2 + 2;
                                //                mycoordsY = mycoordsY + HEX_H / 2;
                                //                neighborcoordsX = neighborcoordsX + HEX_W / 2 + 2;
                                //                neighborcoordsY = neighborcoordsY + HEX_H / 2;
                                //                lines.push([mycoordsX, mycoordsY, neighborcoordsX, neighborcoordsY]);
                                //            }
                                //        }
                                //    }
                                //}
                            }
                            let maxThermoLength = cells.reduce(function (prevItem, currentItem) { return [0, Math.max(prevItem[1], currentItem[1])] })[1];
                            if (maxThermoLength >= displayThermoThreshhold) {
                                thermoLengths.push(maxThermoLength);
                                ctx.strokeStyle = "rgba(0,0,255,.5)";
                                ctx.lineWidth = 2;
                                for (var line of lines) {
                                    ctx.strokeStyle = line[4];

                                    ctx.beginPath();
                                    ctx.moveTo(line[0], line[1]);
                                    ctx.lineTo(line[2], line[3]);
                                    ctx.stroke();
                                }
                            }

                            ////naw man, just for each cell, draw thermo lines to the closest lower and closest higher numbers.  Figure out a way to retrieve info about it later.
                            //let closestNeighborsLow = [];
                            //let closestNeighborsHigh = [];

                            //for (let neighborcoords of getAllNeighborHexCoords([cell.x, cell.y])) {
                            //    let neighborcell = board[iLayer][neighborcoords[0]][neighborcoords[1]];
                            //    if (neighborcell.number > 0) {
                            //        let diff = neighborcell.number - cell.number;
                            //        if (diff ==1 || diff ==2) {
                            //            if (closestNeighborsHigh.length == 0 || closestNeighborsHigh[0].number > neighborcell.number) {
                            //                closestNeighborsHigh = [neighborcell];
                            //            } else if (closestNeighborsHigh[0].number == neighborcell.number) {
                            //                closestNeighborsHigh.push(neighborcell);
                            //            }
                            //        }
                            //        if (diff ==-1 || diff==-2) {
                            //            if (closestNeighborsLow.length == 0 || closestNeighborsLow[0].number < neighborcell.number) {
                            //                closestNeighborsLow = [neighborcell];
                            //            } else if (closestNeighborsLow[0].number == neighborcell.number) {
                            //                closestNeighborsLow.push(neighborcell);
                            //            }
                            //        }
                            //    }
                            //}
                            //if (closestNeighborsHigh.length == 0) {
                            //    localmaxima++;
                            //    let [mycoordsX, mycoordsY] = getDrawCoords(cell.x, cell.y);
                            //    ctx.fillStyle = "rgba(0,255,255,.5)";
                            //    ctx.fillRect(mycoordsX + HEX_W / 2, mycoordsY + HEX_H / 2 - 5, 10, 10);
                            //}
                            //if (closestNeighborsLow.length == 0) {
                            //    let [mycoordsX, mycoordsY] = getDrawCoords(cell.x, cell.y);
                            //    ctx.fillStyle = "rgba(255,0,255,.5)";
                            //    ctx.fillRect(mycoordsX + HEX_W / 2, mycoordsY + HEX_H / 2 - 5, 10, 10);
                            //}
                            //for (let neighborcell of closestNeighborsHigh) {
                            //    let [neighborcoordsX, neighborcoordsY] = getDrawCoords(neighborcell.x, neighborcell.y);
                            //    let [mycoordsX, mycoordsY] = getDrawCoords(cell.x, cell.y);
                            //    mycoordsX = mycoordsX + HEX_W / 2 + 2;
                            //    mycoordsY = mycoordsY + HEX_H / 2;
                            //    neighborcoordsX = neighborcoordsX + HEX_W / 2 + 2;
                            //    neighborcoordsY = neighborcoordsY + HEX_H / 2;
                            //    let colorI = (cell.number-1) * 255 / 9;
                            //    ctx.strokeStyle = "rgba(" + (255 - colorI) + "," + (255 - colorI) + "," + (255 - colorI) + ","+(1-(cell.number/30))+")";
                            //    ctx.lineWidth = 2;
                            //    ctx.beginPath();
                            //    ctx.moveTo(mycoordsX, mycoordsY);
                            //    ctx.lineTo(neighborcoordsX, neighborcoordsY);
                            //    ctx.stroke();
                            //}
                            //for (let neighborcell of closestNeighborsLow) {
                            //    let [neighborcoordsX, neighborcoordsY] = getDrawCoords(neighborcell.x, neighborcell.y);
                            //    let [mycoordsX, mycoordsY] = getDrawCoords(cell.x, cell.y);
                            //    mycoordsX = mycoordsX + HEX_W / 2 + 2;
                            //    mycoordsY = mycoordsY + HEX_H / 2;
                            //    neighborcoordsX = neighborcoordsX + HEX_W / 2 + 2;
                            //    neighborcoordsY = neighborcoordsY + HEX_H / 2;
                            //    ctx.strokeStyle = "rgba(0,0,255,.5)";
                            //    ctx.lineWidth = 2;
                            //    ctx.beginPath();
                            //    ctx.moveTo(mycoordsX, mycoordsY);
                            //    ctx.lineTo(neighborcoordsX, neighborcoordsY);
                            //    ctx.stroke();
                            //}
                        }
                    }
                }


                var localX = localMinimapXOff + minX * minimapWidth;
                var localY = localMinimapYOff + minY * minimapHeight;
                var localwidth = (maxX - minX + 1) * minimapWidth + 2;
                var localheight = (maxY - minY + 1) * minimapHeight + minimapHeight / 2
                addMouseOverText("Layer " + (iLayer + 1), "minimap", localX - 3, localY - 3, localX + localwidth + 3, localY + localheight + 3);

                if (iLayer == currentLayerIdx) {
                    //draw highlight behind current layer
                    ctx.shadowBlur = 2;
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = "rgba(200,200,200,.5)";
                    ctx.strokeRect(localX, localY, localwidth, localheight);
                    ctx.shadowBlur = 0;
                }
            }
            //reset drawing context
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'black';


        }

        for (var thermo of thermos) {
            //draw bulb
            var thermocoords = thermo[0];
            var [drawX, drawY] = getHexCenter(thermocoords[0], thermocoords[1]);
            ctx.fillStyle = "rgba(150,150,150,100)";
            ctx.beginPath();
            ctx.arc(drawX, drawY, HEX_H / 3, 0, 2 * Math.PI);
            ctx.fill();

            ctx.strokeStyle = "rgba(150,150,150,100)";
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(drawX, drawY);
            for (let tidx = 1; tidx < thermo.length; tidx++) {
                let nextthermocoords = thermo[tidx];
                //draw a line from prev to next.
                [drawX, drawY] = getHexCenter(nextthermocoords[0], nextthermocoords[1]);
                ctx.lineTo(drawX, drawY);
                thermocoords = nextthermocoords;

            }
            ctx.stroke();
        }

        ctx.lineWidth = 1;
        ctx.strokeStyle = 'black';

        if (displaySlingshots) {

            //highlight cells that slingshot nearby values toward other cells.
            let flatboard = getFlattenedBoard();
            for (x = 0; x < flatboard.length; ++x) {
                for (y = 0; y < flatboard[x].length; ++y) {
                    var cell = flatboard[x][y];
                    if (cell.hexTypeID == 1) {
                        //if ((x == 12 && y == 9) || (x == 8 && y == 5) || (x == 9 && y == 12)) {
                        if (cell.number > 0 && cell.x) {
                            let cellSlingshotCount = 0;
                            //for each neighbor
                            for (let neighbordir = 0; neighbordir < 6; neighbordir++) {
                                let coordsList = [];
                                coordsList.unshift(getNeighborHexCoords([cell.x, cell.y], neighbordir));
                                let neighborcell = flatboard[coordsList[0][0]][coordsList[0][1]];
                                //check if neighbor has number
                                if (neighborcell.number > 0) {
                                    //start traveling from neighbor coords in neighbors direction for cell.number steps.
                                    let targetnumber = neighborcell.number;
                                    let currentDir = neighbordir;
                                    for (let stepCnt = 0; stepCnt < cell.number; stepCnt++) {
                                        let nextNeighborCoords = getNeighborHexCoords(coordsList[0], currentDir);
                                        let nextNeighborcell = flatboard[nextNeighborCoords[0]][nextNeighborCoords[1]];
                                        if (nextNeighborcell && nextNeighborcell.hexTypeID > 0) {
                                            //we can go forward, so simply set next neighborcoords
                                            coordsList.unshift(nextNeighborCoords);
                                        } else {
                                            //if you can't go forward, check dir-1 and dir+1.  Whichever exists, turn in that direction (but -2 and +2, to make a60 degree angle).  If both or neither exists, turn in -3.

                                            //check if cell exists at dir-1 (giving us the slope of the wall.)  If so, set direction to dir-2 and proceed.  Note: for math, we need to do + 5 % 6 and + 4 % 6, but it means -1 and -2.
                                            let hasDirLessOneCell = false;
                                            nextNeighborCoords = getNeighborHexCoords(coordsList[0], (currentDir + 5) % 6);
                                            nextNeighborcell = flatboard[nextNeighborCoords[0]][nextNeighborCoords[1]];
                                            if (nextNeighborcell && nextNeighborcell.hexTypeID > 0) {
                                                hasDirLessOneCell = true;
                                            }
                                            //check if cell exists at dir+1.  If so, set direction to dir+2 and proceed.
                                            let hasDirPlusOneCell = false;
                                            nextNeighborCoords = getNeighborHexCoords(coordsList[0], (currentDir + 1) % 6);
                                            nextNeighborcell = flatboard[nextNeighborCoords[0]][nextNeighborCoords[1]];
                                            if (nextNeighborcell && nextNeighborcell.hexTypeID > 0) {
                                                hasDirPlusOneCell = true;
                                            }
                                            if (hasDirLessOneCell && !hasDirPlusOneCell) {
                                                currentDir = (currentDir + 4) % 6;
                                            } else if (!hasDirLessOneCell && hasDirPlusOneCell) {
                                                currentDir = (currentDir + 2) % 6;
                                            } else {
                                                //can't turn, so bounce back.
                                                currentDir = (currentDir + 3) % 6;
                                            }
                                            stepCnt--;
                                        }
                                    }

                                    //If target cell number == neighbor number, highlight cell.
                                    neighborcell = flatboard[coordsList[0][0]][coordsList[0][1]];
                                    if (targetnumber == neighborcell.number) {
                                        slingshotCount++;
                                        cellSlingshotCount++;

                                        let drawcoords = getHexCenter(cell.x, cell.y)
                                        ctx.fillStyle = "rgba(0,255,255)";
                                        ctx.fillRect(drawcoords[0] - 8, drawcoords[1] - 8, 16, 16);

                                        //draw line from target back to original
                                        ctx.beginPath();
                                        ctx.moveTo(drawcoords[0], drawcoords[1]);
                                        for (let i = coordsList.length - 1; i >= 0; i--) {
                                            drawcoords = getHexCenter(coordsList[i][0], coordsList[i][1]);
                                            ctx.lineTo(drawcoords[0], drawcoords[1]);
                                        }
                                        ctx.stroke();
                                        //draw green square around target.
                                        ctx.fillStyle = 'green';
                                        ctx.fillRect(drawcoords[0] - 5, drawcoords[1] - 5, 10, 10);
                                    }
                                }
                            }
                            if (cellSlingshotCount > 1) {
                                slingshotCounts.push(cellSlingshotCount);
                            }
                        }
                    }
                }
            }

            //reset drawing context
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'black';
        }
        if (displayAdjacent) {
            //highlight cells that are adjacent to other cells with a value of this cell +-1.
            let flatboard = getFlattenedBoard();
            for (x = 0; x < flatboard.length; ++x) {
                for (y = 0; y < flatboard[x].length; ++y) {
                    var cell = flatboard[x][y];
                    if (cell.hexTypeID == 1) {
                        if (cell.number > 0 && cell.x) {
                            for (let neighbordir = 0; neighbordir < 6; neighbordir++) {
                                let neighborCoords = getNeighborHexCoords([cell.x, cell.y], neighbordir);
                                let neighborcell = flatboard[neighborCoords[0]][neighborCoords[1]];
                                //check if neighbor has number
                                if (neighborcell.hexTypeID == 1 && neighborcell.number > 0 && Math.abs(cell.number - neighborcell.number) == 1) {

                                    ctx.strokeStyle = "rgba(120,50,50)";
                                    let drawcoords = getHexCenter(cell.x, cell.y)
                                    //draw line from target back to original
                                    ctx.beginPath();
                                    ctx.moveTo(drawcoords[0], drawcoords[1]);
                                    drawcoords = getHexCenter(neighborcell.x, neighborcell.y);
                                    ctx.lineTo(drawcoords[0], drawcoords[1]);
                                    ctx.stroke();
                                    //draw green square around target.
                                }
                            }
                        }
                    }
                }
            }

            //reset drawing context
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'black';
        }

        if (displayCloneRegions) {
            //detected clone snakes: for each number, find other cells in the grid with the same number.  For each neighbor, see if other cells also have that neighbor in that position.  If so, draw a line there.  
            //Then keep going, ensuring that there are at least three steps.
            //OK, so I have all the linkages.  Now to keep going, ensuring at least three steps.

            //highlight cells that are adjacent to other cells with a value of this cell +-1.
            let flatboard = getFlattenedBoard();
            for (x = 0; x < flatboard.length; ++x) {
                for (y = 0; y < flatboard[x].length; ++y) {
                    var cell = flatboard[x][y];
                    if (cell.hexTypeID == 1) {
                        //if (cell.number != 1) continue;
                        if (cell.number > 0 && cell.x) {
                            //get all other cells with this number.

                            for (let clonex = 0; clonex < flatboard.length; ++clonex) {
                                for (let cloney = 0; cloney < flatboard[clonex].length; ++cloney) {
                                    if (clonex == x) continue;

                                    var clonecell = flatboard[clonex][cloney];
                                    if (clonecell.hexTypeID == 1 && clonecell.number == cell.number) {
                                        if (clonecell.number > 0 && clonecell.x) {
                                            for (let neighbordir = 0; neighbordir < 6; neighbordir++) {
                                                let neighborCoords = getNeighborHexCoords([cell.x, cell.y], neighbordir);
                                                var neighborcell = flatboard[neighborCoords[0]][neighborCoords[1]];
                                                let cloneneighborCoords = getNeighborHexCoords([clonecell.x, clonecell.y], neighbordir);
                                                var cloneneighborcell = flatboard[cloneneighborCoords[0]][cloneneighborCoords[1]];
                                                if (neighborcell.number && neighborcell.hexTypeID == 1 && cloneneighborcell.hexTypeID == 1 && neighborcell.number == cloneneighborcell.number) {


                                                    //move from the clone neighbors
                                                    for (let neighbordir2 = 0; neighbordir2 < 6; neighbordir2++) {
                                                        if (Math.abs(neighbordir - neighbordir2) == 3) continue;

                                                        let neighborCoords2 = getNeighborHexCoords([neighborcell.x, neighborcell.y], neighbordir2);
                                                        var neighborcell2 = flatboard[neighborCoords2[0]][neighborCoords2[1]];
                                                        let cloneneighborCoords2 = getNeighborHexCoords([cloneneighborcell.x, cloneneighborcell.y], neighbordir2);
                                                        var cloneneighborcell2 = flatboard[cloneneighborCoords2[0]][cloneneighborCoords2[1]];
                                                        if (neighborcell2.number && neighborcell2.hexTypeID == 1 && cloneneighborcell2.hexTypeID == 1 && neighborcell2.number == cloneneighborcell2.number) {

                                                            //move from the clone neighbors #3
                                                            for (let neighbordir3 = 0; neighbordir3 < 6; neighbordir3++) {
                                                                if (Math.abs(neighbordir2 - neighbordir3) == 3) continue;

                                                                let neighborCoords3 = getNeighborHexCoords([neighborcell2.x, neighborcell2.y], neighbordir3);
                                                                var neighborcell3 = flatboard[neighborCoords3[0]][neighborCoords3[1]];

                                                                //avoid triangles
                                                                if (neighborcell3 == cell) continue;

                                                                let cloneneighborCoords3 = getNeighborHexCoords([cloneneighborcell2.x, cloneneighborcell2.y], neighbordir3);
                                                                var cloneneighborcell3 = flatboard[cloneneighborCoords3[0]][cloneneighborCoords3[1]];
                                                                if (neighborcell3.number && neighborcell3.hexTypeID == 1 && cloneneighborcell3.hexTypeID == 1 && neighborcell3.number == cloneneighborcell3.number) {

                                                                    //move from the clone neighbors #4
                                                                    for (let neighbordir4 = 0; neighbordir4 < 6; neighbordir4++) {
                                                                        if (Math.abs(neighbordir3 - neighbordir4) == 3) continue;

                                                                        let neighborCoords4 = getNeighborHexCoords([neighborcell3.x, neighborcell3.y], neighbordir4);
                                                                        var neighborcell4 = flatboard[neighborCoords4[0]][neighborCoords4[1]];

                                                                        //avoid triangles and short loops
                                                                        if (neighborcell4 == cell || neighborcell4 == neighborcell || neighborcell4 == neighborcell2 || neighborcell4 == neighborcell3) continue;

                                                                        let cloneneighborCoords4 = getNeighborHexCoords([cloneneighborcell3.x, cloneneighborcell3.y], neighbordir4);
                                                                        var cloneneighborcell4 = flatboard[cloneneighborCoords4[0]][cloneneighborCoords4[1]];
                                                                        if (neighborcell4.number && neighborcell4.hexTypeID == 1 && cloneneighborcell4.hexTypeID == 1 && neighborcell4.number == cloneneighborcell4.number) {

                                                                            ctx.strokeStyle = "rgba(0,200,200)";

                                                                            let drawcoords = getHexCenter(cell.x, cell.y)
                                                                            //draw line from target back to original
                                                                            ctx.beginPath();
                                                                            ctx.moveTo(drawcoords[0], drawcoords[1]);
                                                                            drawcoords = getHexCenter(neighborcell.x, neighborcell.y);
                                                                            ctx.lineTo(drawcoords[0], drawcoords[1]);
                                                                            drawcoords = getHexCenter(neighborcell2.x, neighborcell2.y);
                                                                            ctx.lineTo(drawcoords[0], drawcoords[1]);
                                                                            drawcoords = getHexCenter(neighborcell3.x, neighborcell3.y);
                                                                            ctx.lineTo(drawcoords[0], drawcoords[1]);
                                                                            drawcoords = getHexCenter(neighborcell4.x, neighborcell4.y);
                                                                            ctx.lineTo(drawcoords[0], drawcoords[1]);
                                                                            ctx.stroke();

                                                                            drawcoords = getHexCenter(clonecell.x, clonecell.y)
                                                                            ctx.beginPath();
                                                                            ctx.moveTo(drawcoords[0], drawcoords[1]);
                                                                            drawcoords = getHexCenter(cloneneighborcell.x, cloneneighborcell.y);
                                                                            ctx.lineTo(drawcoords[0], drawcoords[1]);
                                                                            drawcoords = getHexCenter(cloneneighborcell2.x, cloneneighborcell2.y);
                                                                            ctx.lineTo(drawcoords[0], drawcoords[1]);
                                                                            drawcoords = getHexCenter(cloneneighborcell3.x, cloneneighborcell3.y);
                                                                            ctx.lineTo(drawcoords[0], drawcoords[1]);
                                                                            drawcoords = getHexCenter(cloneneighborcell4.x, cloneneighborcell4.y);
                                                                            ctx.lineTo(drawcoords[0], drawcoords[1]);
                                                                            ctx.stroke();

                                                                            ctx.strokeStyle = "black";
                                                                        }
                                                                    }
                                                                }
                                                            }

                                                        }
                                                    }




                                                }
                                            }
                                        }
                                    }
                                }
                            }

                        }
                    }
                }
            }

            //reset drawing context
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'black';
        }


        for (let [s, x, y, c] of drawStrings) {
            drawString(s, x, y, c);
        }

        var layerLines = [];
        for (var iLayer = 0; iLayer < board.length; iLayer++) {
            //display board text further down in the webpage.
            var lines = [];
            var boardWidth = 0;
            var boardHeight = 0;
            for (y = 0; y < board[iLayer][0].length; ++y) {
                var line = "";
                var lineBuffer = "";
                for (x = 0; x < board[iLayer].length; ++x) {
                    var hexTypeID = board[iLayer][x][y].hexTypeID;
                    var boardValue = String.fromCharCode(64 + hexTypeID);
                    if (hexTypeID > 0) {
                        var number = board[iLayer][x][y].number;
                        if (number > 0) {
                            lineBuffer += number.toString();
                        }
                    }
                    lineBuffer += boardValue;
                    if (hexTypeID > 0) {
                        if (x > boardWidth) {
                            boardWidth = x;
                        }
                        if (y > boardHeight) {
                            boardHeight = y;
                        }
                        line += lineBuffer;
                        lineBuffer = "";
                    }
                }
                lines.push(line || "@");
            }
            lines.length = boardHeight + 1;
            //for (var i = 0; i < lines.length; i++) {
            //lines[i] = lines[i].substr(0, boardWidth + 1);
            //}
            layerLines.push(lines.join(";"));

        }
        var boardDef = description + "~" + JSON.stringify(thermos) + "~" + layerLines.join("~").replace(/@/g, ".");
        $("#txtBoardDefinition").val(boardDef);
        window.localStorage.setItem("boardDef", boardDef);

        if (displayXV) {
            xCounter /= 2;
            vCounter /= 2;
            $("#log").val("Xs: " + xCounter.toString() + ", Vs: " + vCounter.toString());
        }

        if (thermoLengths.length) {
            let maxThermoLength = Math.max(...thermoLengths);
            let TotalThermosLength = thermoLengths.reduce(function (total, num) { return total + num; });
            thermoLengths.sort().reverse();
            $("#log").val("Thermo lengths: " + thermoLengths + "\nMax: " + maxThermoLength + ", Total: " + TotalThermosLength);
        }

        if (slingshotCount) {
            slingshotCounts.sort().reverse();
            $("#log").val("Slingshots: " + slingshotCount + "\nWith this many crammed in: " + slingshotCounts);
        }

        ////export coordinates
        ////for each layer,
        //layerLines = [];
        //for (var iLayer = 0; iLayer < board.length; iLayer++) {
        //    var filledCount = 0;
        //    var buckets = [];
        //    for (var i = 0; i < hexTypes.length; i++) {
        //        buckets[i] = "";
        //    }
        //    //for each x/y
        //    for (y = 0; y < board[iLayer][0].length; ++y) {
        //        for (x = 0; x < board[iLayer].length; ++x) {
        //            if (board[iLayer][x][y] > 0) {
        //                //sort into buckets, each of which is a list of coords
        //                buckets[board[iLayer][x][y]] += "[" + x + "," + y + "],"
        //                filledCount++;
        //            }
        //        }
        //    }
        //    //iterate contents of the buckets, printing them out.
        //    for (var i = 0; i < buckets.length; i++) {
        //        if (buckets[i] != "") {
        //            layerLines.push("{ color: \"" + hexTypes[i].color + "\", hexes: [" + buckets[i] + "]}" + "//" + (iLayer + 1) + ": " + hexTypes[i].name);
        //        }
        //    }
        //}
        //$("#txtBoardDefinitionCoords").val("this.levelList[LEVELINDEX].goalShapes.push(\n" + layerLines.join("\n        ,") + "\n" + ");");

        drawToolbox();
        //for (var i = 0; i < mouseOverTexts.length; i++) {
        //    var m = mouseOverTexts[i];
        //    ctx.strokeRect(m.left, m.top, m.right - m.left, m.bottom - m.top);
        //}

        //draw rotated version to second canvas
        var canvasRot = document.getElementById('canvasRot');
        var ctxRot = canvasRot.getContext('2d');
        ctxRot.putImageData(ctx.getImageData(0, 0, 1024, 768), 0, 0);

        canvasRot = document.getElementById('canvasRot2');
        var ctxRot = canvasRot.getContext('2d');
        ctxRot.putImageData(ctx.getImageData(0, 0, 1024, 768), 0, 0);

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
                drawString(tool.draw, tool.x + tool.width / 2 - 3.5, tool.y + 3.5, "black");
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

    function getToolAtCoords(mouseX, mouseY) {
        for (var i = 0; i < tools.length; i++) {
            var tool = tools[i];
            if (tool.x <= mouseX && mouseX <= tool.x + tool.width && tool.y <= mouseY && mouseY <= tool.y + tool.height) {
                return tool;
            }
        }
    }
    function addMouseOverText(text, type, left, top, right, bottom) {
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
                if (typeof mouseOverText.text == "string") {
                    return mouseOverText.text;
                } else {
                    return mouseOverText.text();
                }
            }
        }
    }
    var isMouseDown = false;
    var showingMouseOver = false;
    function handleMouse(e, eventType) {
        e.preventDefault();
        e.stopPropagation();

        var canvasOffset = $canvas.offset();
        var offsetX = canvasOffset.left;
        var offsetY = canvasOffset.top;
        var mouseX = parseInt(e.clientX - offsetX);
        var mouseY = parseInt(e.clientY - offsetY);
        if (eventType == "move") {
            if (currentTool == "Pencil") {
                var prevHexCoords = getMouseHexCoords(prevMouseX, prevMouseY);
                var hexCoords = getMouseHexCoords(mouseX, mouseY);
                if (prevHexCoords[0] != hexCoords[0] || prevHexCoords[1] != hexCoords[1]) {
                    usePencil(mouseX, mouseY, e.shiftKey, e.ctrlKey);
                }
            }
            if (showingMouseOver) {
                showingMouseOver = false;
                drawBoard();
            }
            var mouseOverText = getMouseOverTextAtCoords(mouseX, mouseY);
            if (mouseOverText) {
                drawString(mouseOverText, mouseX, mouseY + 20, "black", "white");
                showingMouseOver = true;
            }
        } else if (eventType == "down") {
            var handled = false;
            //check tools first
            var tool = getToolAtCoords(mouseX, mouseY);
            if (tool) {
                handled = true;
                tool.click(e.ctrlKey, e.shiftKey);
            }
            if (!handled) {
                //check board
                isMouseDown = true;
                if (selectLayerToolActive) {
                    var hexCoords = getMouseHexCoords(mouseX, mouseY);
                    if (inBoard(hexCoords[0], hexCoords[1])) {
                        selectLayerToolActive = false;
                        setCurrentLayerIdx(getBoardLayerIdx(hexCoords));
                    }
                } else if (currentTool == "Thermo") {
                    var hexCoords = getMouseHexCoords(mouseX, mouseY);
                    if (inBoard(hexCoords[0], hexCoords[1])) {
                        let cell = getBoardCell(hexCoords);
                        if (cell) {
                            registerBoardChange();
                            //check if this is in a thermo.  if so, remove this cell and all above it.
                            //todo: clean up thermos which are contained within other thermos, to handle case when we just trimmed off a split portion.
                            let foundit = false;
                            for (let tidx = thermos.length - 1; tidx >= 0; tidx--) {
                                for (let tidx2 = 0; tidx2 < thermos[tidx].length; tidx2++) {
                                    var thermocellcoords = thermos[tidx][tidx2]
                                    if (thermocellcoords[0] == cell.x && thermocellcoords[1] == cell.y) {
                                        foundit = true;
                                        if (tidx2 == 0) {
                                            thermos.splice(tidx, 1);
                                        } else {
                                            thermos[tidx].splice(tidx2, thermos[tidx].length - tidx2);
                                        }
                                        break;
                                    }
                                }
                                if (foundit) break;
                            }
                            if (!foundit) {
                                //if not, check if adjacent cells are in any thermos.  if so, add to the nearest thermo cell.
                                let closestAdjacentThermo = null;
                                let closestAdjacentThermoCellID = null;
                                let closestAdjacentThermoDist = 1000000;
                                for (let neighborcell of getAllNeighborHexCoords(hexCoords)) {
                                    //check all thermos to see if they exist.
                                    foundit = false;
                                    for (let thermo of thermos) {
                                        //for (let thermocell of thermo) {
                                        for (let tidx = 0; tidx < thermo.length; tidx++) {
                                            if (neighborcell[0] == thermo[tidx][0] && neighborcell[1] == thermo[tidx][1]) {
                                                let neighborcenter = getHexCenter(neighborcell[0], neighborcell[1]);
                                                let dist = Math.pow(mouseX - neighborcenter[0], 2) + Math.pow(mouseY - neighborcenter[1], 2);
                                                if (dist < closestAdjacentThermoDist) {
                                                    closestAdjacentThermo = thermo;
                                                    closestAdjacentThermoCellID = tidx;
                                                    closestAdjacentThermoDist = dist;
                                                }
                                                foundit = true;
                                                break;
                                            }
                                        }
                                        if (foundit) break;
                                    }
                                }
                                if (closestAdjacentThermo) {
                                    //put cell onto end of existing thermo.
                                    if (closestAdjacentThermoCellID == closestAdjacentThermo.length - 1) {
                                        closestAdjacentThermo.push([cell.x, cell.y]);
                                    } else {
                                        //create new thermo split from last, with this cell as last one.
                                        let newthermo = [];
                                        for (let tidx = 0; tidx <= closestAdjacentThermoCellID; tidx++) {
                                            newthermo.push([closestAdjacentThermo[tidx][0], closestAdjacentThermo[tidx][1]]);
                                        }
                                        newthermo.push([cell.x, cell.y]);
                                        thermos.push(newthermo);
                                    }
                                } else {
                                    //start new thermo.
                                    thermos.push([[cell.x, cell.y]]);
                                }
                            }
                            drawBoard();
                        }
                    }
                } else if (currentTool == "Pencil") {
                    var boardJSON = getBoardJSON();
                    if (usePencil(mouseX, mouseY, e.shiftKey, e.ctrlKey)) {
                        registerBoardChange(boardJSON);
                    }
                } else if (currentTool == "Fill") {
                    var hexCoords = getMouseHexCoords(mouseX, mouseY);
                    var x = hexCoords[0];
                    var y = hexCoords[1];
                    if (inBoard(x, y)) {
                        var boardJSON = getBoardJSON();
                        var layerIdx = currentLayerIdx;
                        if (e.ctrlKey || drawOnExistingLayer) {
                            layerIdx = getBoardLayerIdx(hexCoords);
                            if (layerIdx == -1) {
                                layerIdx = currentLayerIdx;
                            }

                            //for (var lidx = layerIdx; lidx >= 0; lidx--) {
                            //    if (board[lidx][x][y] != 0) {
                            //        layerIdx = lidx;
                            //        break;
                            //    }
                            //}
                        }
                        var fillColor = currentHexType;
                        if (e.shiftKey) {
                            fillColor = 0;
                        } else if (currentHexType == -1) {
                            fillColor = determineSolveColor(mouseX, mouseY);
                        }
                        if (useFill(hexCoords, board[layerIdx][x][y].hexTypeID, fillColor, layerIdx)) {
                            registerBoardChange(boardJSON);
                        }
                        drawBoard();
                    }
                }
            }
        } else if (eventType == "up") {
            isMouseDown = false;
            prevMouseX = null;
            prevMouseY = null;
        }
    }
    function getBoardJSON() {
        return JSON.stringify({ "desc": description, "board": board, "thermos": thermos });
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
        thermos = b.thermos;
        resetBoardDisplay();
    }
    function consolidateBoardLayers() {
        for (var layerIdx = board.length - 1; layerIdx >= 0; layerIdx--) {
            //detect if layer has filled in bits.  If not, remove it.
            var isEmpty = true;
            for (var col of board[layerIdx]) {
                for (var cell of col) {
                    if (cell.hexTypeID > 0) {
                        isEmpty = false;
                        break;
                    }
                }
                if (!isEmpty) {
                    break;
                }
            }
            if (isEmpty) {
                board.splice(layerIdx, 1);
            }
        }
    }
    function consolidateBoardLayersUp() {
        registerBoardChange();
        consolidateBoardLayers();

        //add in layers to make them add up to 50 again.
        while (board.length < 50) {
            board.unshift([]);
            resetLayer(0);
        }
        setCurrentLayerIdx(LAYERCNT - 1);
    }
    function consolidateBoardLayersDown() {
        registerBoardChange();
        consolidateBoardLayers();

        //add in layers to make them add up to 50 again.
        while (board.length < 50) {
            board.push([]);
            resetLayer(board.length - 1);
        }
        setCurrentLayerIdx(0);
    }

    function determineSolveColor(mouseX, mouseY) {
        //detect the color at this point, go to next in sequence between ON, OFF, undetermined.
        var hexCoords = getMouseHexCoords(mouseX, mouseY);
        if (inBoard(hexCoords[0], hexCoords[1])) {

            var layerIdx = drawOnExistingLayer ? getBoardLayerIdx(hexCoords) : currentLayerIdx;
            if (layerIdx == -1) {
                layerIdx = currentLayerIdx;
            }
            var hexTypeID = board[layerIdx][hexCoords[0]][hexCoords[1]].hexTypeID;
            if (hexTypeID == 1 || hexTypeID == 0) {
                //OFF or nothing, set to undetermined
                return layerIdx % 5 + 3;
            } else if (hexTypeID == 2) {
                //ON, set to OFF
                return 1;
            } else {
                //undetermined, set to ON
                return 2;
            }
        } else {
            return 0;
        }
    }

    var prevMouseX = null;
    var prevMouseY = null;
    function usePencil(mouseX, mouseY, shiftKey, ctrlKey) {
        var changed = false;
        if (isMouseDown) {
            var hexTypeID = currentHexType;
            if (shiftKey) {
                hexTypeID = 0;
            } else if (currentHexType == -1) {
                hexTypeID = determineSolveColor(mouseX, mouseY);
            }

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
                    //if ctrlKey is down, only affect already drawn tiles at the highest layer possible.
                    var layerIdx = currentLayerIdx;
                    if (ctrlKey || drawOnExistingLayer) {
                        layerIdx = getBoardLayerIdx(hexCoords);
                        if (layerIdx == -1) {
                            layerIdx = currentLayerIdx;
                        }

                        //for (var lidx = layerIdx; lidx >= 0; lidx--) {
                        //    if (board[lidx][x][y] != 0) {
                        //        layerIdx = lidx;
                        //        break;
                        //    }
                        //}
                    }
                    if (mergeLayerToolActive) {
                        setBoardHexType([x, y], layerIdx, 0);
                        layerIdx = currentLayerIdx;
                    }
                    var hexType = hexTypes[hexTypeID];
                    if (hexType.color == "Plum") {//the numbers.
                        setBoardNumber([x, y], layerIdx, Number(hexType.symbol))
                    }
                    else {
                        setBoardHexType([x, y], layerIdx, hexTypeID);
                    }
                    changed = true;
                }
            }
            drawBoard();

            prevMouseX = mouseX;
            prevMouseY = mouseY;
        }
        return changed;
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
        return !(typeof board[currentLayerIdx][x] == 'undefined' || typeof board[currentLayerIdx][x][y] == 'undefined');
    }
    function useFill(hexCoords, targetColor, newcolor, layerIdx) {
        var changedBoard = false;
        var fillList = getFillList(hexCoords, targetColor, getLayerCopy(board[layerIdx]));
        for (var coords of fillList) {
            changedBoard = true;
            if (mergeLayerToolActive) {
                setBoardHexType(coords, layerIdx, 0);
                setBoardHexType(coords, currentLayerIdx, newcolor);
            } else {
                setBoardHexType(coords, layerIdx, newcolor);
            }
        }
        return changedBoard;
    };
    function getFillList(hexCoords, targetColor, layer, fillList) {
        fillList = fillList || [];
        var x = hexCoords[0];
        var y = hexCoords[1];
        for (var coords of fillList) {
            if (x == coords[0] && y == coords[1]) {
                return fillList;
            }
        }
        if (inBoard(x, y) && layer[x][y].hexTypeID == targetColor) {
            fillList.push(hexCoords);
            //for each neighbor, if it is the target color, run fill on it.
            for (var i = 0; i < 6; i++) {
                fillList = getFillList(getNeighborHexCoords(hexCoords, i), targetColor, layer, fillList);
            }
        }
        return fillList;
    };

    function getConnectedRegions(regionMap) {
        if (!regionMap) {
            regionMap = getFlattenedBoard();
        } else {
            regionMap = getLayerCopy(regionMap);
        }
        var connectedRegions = [];
        //regions can be identified by the coordinates of the first filled cell in the region.
        for (var x = 0; x < COLS; ++x) {
            for (var y = 0; y < ROWS; ++y) {
                if (regionMap[x][y].hexTypeID == 2) {
                    //not in an existing region.
                    //mark all adjacent filled in cells as in this region.
                    var fillList = getFillList([x, y], 2, regionMap)
                    for (var coords of fillList) {
                        regionMap[coords[0]][coords[1]].hexTypeID = 0;
                    }
                    connectedRegions.push(fillList);
                }
            }
        }
        return connectedRegions;
    }
    function shuffleArray(ar) {
        for (i = ar.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * i);
            let k = ar[i];
            ar[i] = ar[j];
            ar[j] = k;
        }
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
    function getAdjacentUnknownCells(cellList, flatBoard) {
        flatBoard = flatBoard || getFlattenedBoard();
        var adjacentUnknownCells = [];
        for (var coords of cellList) {
            for (var dir = 0; dir < 6; dir++) {
                var neighborCoords = getNeighborHexCoords(coords, dir);
                if (flatBoard[neighborCoords[0]][neighborCoords[1]].hexTypeID > 2) {
                    adjacentUnknownCells.push(neighborCoords);
                }
            }
        }
        return dedupeArray(adjacentUnknownCells);
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
    function solveBoardWithGuesses(guessLog, skipGuessingCoordsList) {
        //todo: pay attention to undoboards length to determine which guessing path is shortest to get to a contradiction.
        //todo: detect cases where no matter what the unknowns do (even all turning on), they can't connect the region.  AKA region with unknowns, but fully surrounded by OFF.
        //todo: if needed, test multiple chained guesses.  This should not be needed though.
        //todo: have it guess whole shapes at a time to better understand dead ends.

        guessLog = guessLog || "";
        skipGuessingCoordsList = skipGuessingCoordsList || [];


        guessLog += "Solving.\n";
        var errorMsg = solveBoard();
        if (errorMsg != "") {
            guessLog += "Solving Result: " + errorMsg + "\n";
        }
        //we've gone as far as we can logically (with current rules, anyway).  Time to test some possibilities.
        var connectedRegions = getConnectedRegions();
        var regionAdjacentUnknownCells = [];

        //get the adjacent unknowns to determine which region is has fewest, and is thus a good candidate for guessing.
        var flatBoard = getFlattenedBoard();
        for (var regionID = 0; regionID < connectedRegions.length; regionID++) {
            //get adjacent (not within region) cells
            regionAdjacentUnknownCells[regionID] = getAdjacentUnknownCells(connectedRegions[regionID], flatBoard);
        }

        //try all until we encounter a cell that leads to a conflict.  Mark the proper value, then, recursively guess/solve after that.
        var retriedSkippedGuessingCoords = false;
        while (regionAdjacentUnknownCells.length > 0) {
            var minAdjacentCellCount = 10000;
            var minAdjacentCellsRegionID = -1;
            //get a cell that belongs to a region with the fewest adjacent unknowns.
            for (var regionID = regionAdjacentUnknownCells.length - 1; regionID >= 0; regionID--) {
                if (regionAdjacentUnknownCells[regionID].length == 0) {
                    regionAdjacentUnknownCells.splice(regionID, 1);
                    minAdjacentCellsRegionID--;
                } else if (regionAdjacentUnknownCells[regionID].length < minAdjacentCellCount) {
                    minAdjacentCellCount = regionAdjacentUnknownCells[regionID].length;
                    minAdjacentCellsRegionID = regionID;
                }
            }

            if (minAdjacentCellsRegionID < 0) {
                if (skipGuessingCoordsList.length > 0 && !retriedSkippedGuessingCoords) {
                    //give these another chance now.  Warning: these can be from the same or diverse regions, so could break any future logic which counts on one list containing 1 region's cells.
                    guessLog += "Retrying the cells previously skipped.\n";
                    for (var skipGuessingCoords of skipGuessingCoordsList) {
                        if (getBoardValue(skipGuessingCoords) > 2) {
                            regionAdjacentUnknownCells.push([skipGuessingCoords]);
                        }
                    }
                    skipGuessingCoordsList = [];
                    //only reload once, otherwise we've got an infinite loop.
                    retriedSkippedGuessingCoords = true;
                } else {
                    guessLog += "Done guessing: Can't find a region to test.\n";
                }
            } else {
                var guessingCoords = regionAdjacentUnknownCells[minAdjacentCellsRegionID].pop();//any unknown cell adjacent to region.
                var skippingThis = false;
                for (var skipGuessingCoords of skipGuessingCoordsList) {
                    if (guessingCoords[0] == skipGuessingCoords[0] && guessingCoords[1] == skipGuessingCoords[1]) {
                        skippingThis = true;
                        break;
                    }
                }
                if (skippingThis) {
                    continue;
                }
                var boardJSON = getBoardJSON();
                registerBoardChange();
                var prevBoardValue = board[49][guessingCoords[0]][guessingCoords[1]].hexTypeID;
                setBoardHexType(guessingCoords, 49, 3);
                registerBoardChange();
                setBoardHexType(guessingCoords, 49, prevBoardValue);
                setBoardHexType(guessingCoords, -1, 1);
                guessLog += "Guessing (" + guessingCoords + ") is OFF" + "\n";

                errorMsg = solveBoard();
                registerBoardChange();
                doBoardChange(boardJSON);
                if (errorMsg != "" && errorMsg != SOLVE_SUCCESS_MSG) {
                    guessLog += "Result: " + errorMsg + ".  Rolling back and marking (" + guessingCoords + ") as ON. \n";
                    setBoardHexType(guessingCoords, 49, 6);
                    registerBoardChange();
                    setBoardHexType(guessingCoords, 49, prevBoardValue);
                    setBoardHexType(guessingCoords, -1, 2);
                    //continue solving, based on this new information that it's off
                    guessLog = solveBoardWithGuesses(guessLog, skipGuessingCoordsList);
                    break;
                } else {
                    //test turning the cell off and see what happens.
                    registerBoardChange();
                    setBoardHexType(guessingCoords, 49, 3);
                    registerBoardChange();
                    setBoardHexType(guessingCoords, 49, prevBoardValue);
                    setBoardHexType(guessingCoords, -1, 2);
                    guessLog += "No conflict marking as OFF. Rolling back.\nGuessing (" + guessingCoords + ") is ON" + "\n";

                    errorMsg = solveBoard();
                    registerBoardChange();
                    doBoardChange(boardJSON);
                    if (errorMsg != "" && errorMsg != SOLVE_SUCCESS_MSG) {
                        guessLog += "Result: " + errorMsg + ".  Rolling back and marking (" + guessingCoords + ") as OFF. \n";
                        registerBoardChange();
                        setBoardHexType(guessingCoords, 49, 6);
                        registerBoardChange();
                        setBoardHexType(guessingCoords, 49, prevBoardValue);
                        setBoardHexType(guessingCoords, -1, 1);
                        //continue solving, based on this new information that it's off
                        guessLog = solveBoardWithGuesses(guessLog, skipGuessingCoordsList);
                        break;
                    } else {
                        //either reached another point needing a guess, or finished.  Test whether there's exactly one region now.
                        //Roll back and try another.  Looking for a logical solve, which means proving that others won't work.
                        guessLog += "Could not find a conflict with this cell.  Rolling back and skipping (" + guessingCoords + "). \n";
                        skipGuessingCoordsList.push(guessingCoords);
                        //todo: check if this is complete.  If so, check that it follows the rules: each area is valid 4 connected cells, no similar shapes etc.
                    }
                }
            }
        }

        return guessLog;
    }

    function checkCellsAreThermo(cell1Coords, cell2Coords, cell3Coords, cell4Coords) {
        return true;
        //also returns true if any cell is missing a number
        let cell1Num = getBoardCell(cell1Coords).number;
        if (cell1Num) {
            let cell2Num = getBoardCell(cell2Coords).number;
            let cell3Num = getBoardCell(cell3Coords).number;
            let cell4Num = getBoardCell(cell4Coords).number;
            if (cell2Num && cell3Num && cell4Num) {
                //for each cell, ensure they are the same lower/higher than first cell;
                return (cell1Num < cell2Num && cell2Num < cell3Num && cell3Num < cell4Num)
                    || (cell1Num > cell2Num && cell2Num > cell3Num && cell3Num > cell4Num);
            }
        }
        return true;
    }
    function getShape(cells) {
        for (var cellIdx = cells.length - 1; cellIdx >= 0; cellIdx--) {
            var totalNeighbors = 0;
            var coords = cells[cellIdx];
            var neighbor1Dir = 0;
            for (var neighborCellIdx = cells.length - 1; neighborCellIdx >= 0; neighborCellIdx--) {
                var neighborCoordsA = cells[neighborCellIdx];
                for (var dir = 0; dir < 6; dir++) {
                    var neighborCoordsB = getNeighborHexCoords(coords, dir);
                    if (neighborCoordsA[0] == neighborCoordsB[0] && neighborCoordsA[1] == neighborCoordsB[1]) {
                        neighbor1Dir = dir;
                        totalNeighbors++;
                        break;
                    }
                }
            }
            if (totalNeighbors == 1) {
                var coords2 = getNeighborHexCoords(coords, neighbor1Dir);
                //detect neighbors in neighbordir -1, 0, +1
                var neighbor3CoordsA = getNeighborHexCoords(coords2, (neighbor1Dir - 1 + 6) % 6);
                var neighbor3CoordsB = getNeighborHexCoords(coords2, neighbor1Dir);
                var neighbor3CoordsC = getNeighborHexCoords(coords2, (neighbor1Dir + 1) % 6);
                var hasNeighbor3A = false;
                var hasNeighbor3B = false;
                var hasNeighbor3C = false;

                for (var neighbor3CellIdx = cells.length - 1; neighbor3CellIdx >= 0; neighbor3CellIdx--) {
                    var coords3 = cells[neighbor3CellIdx];
                    hasNeighbor3A = hasNeighbor3A || (coords3[0] == neighbor3CoordsA[0] && coords3[1] == neighbor3CoordsA[1]);
                    hasNeighbor3B = hasNeighbor3B || (coords3[0] == neighbor3CoordsB[0] && coords3[1] == neighbor3CoordsB[1]);
                    hasNeighbor3C = hasNeighbor3C || (coords3[0] == neighbor3CoordsC[0] && coords3[1] == neighbor3CoordsC[1]);
                }
                if (hasNeighbor3A && hasNeighbor3C) {
                    //enforce thermometer constraint.  either inside is lower than all outsides, or vice versa.
                    let cell1Num = null;//getBoardCell(coords2).number;
                    if (cell1Num) {
                        //get the outer cells
                        let cell2Num = getBoardCell(coords).number;
                        let cell3Num = getBoardCell(neighbor3CoordsA).number;
                        let cell4Num = getBoardCell(neighbor3CoordsC).number;
                        if (cell2Num && cell3Num && cell4Num) {
                            //for each outer cell, ensure they are the same parity (lower/higher than inner cell);
                            if (cell1Num < cell2Num && cell1Num < cell3Num && cell1Num < cell4Num) {
                                return "Y";
                            } else if (cell1Num > cell2Num && cell1Num > cell3Num && cell1Num > cell4Num) {
                                return "Y";
                            } else {
                                return "";
                            }
                        } else {
                            return "Y";
                        }
                    } else {
                        return "Y";
                    }
                } else {
                    var neighbor4CoordsA;
                    var neighbor4CoordsB;
                    var neighbor4CoordsC;
                    var hasNeighbor4A = false;
                    var hasNeighbor4B = false;
                    var hasNeighbor4C = false;

                    if (hasNeighbor3B) {
                        neighbor4CoordsA = getNeighborHexCoords(neighbor3CoordsB, (neighbor1Dir - 1 + 6) % 6);
                        neighbor4CoordsB = getNeighborHexCoords(neighbor3CoordsB, neighbor1Dir);
                        neighbor4CoordsC = getNeighborHexCoords(neighbor3CoordsB, (neighbor1Dir + 1) % 6);
                        for (var neighbor4CellIdx = cells.length - 1; neighbor4CellIdx >= 0; neighbor4CellIdx--) {
                            var coords4 = cells[neighbor4CellIdx];
                            hasNeighbor4A = hasNeighbor4A || (coords4[0] == neighbor4CoordsA[0] && coords4[1] == neighbor4CoordsA[1]);
                            hasNeighbor4B = hasNeighbor4B || (coords4[0] == neighbor4CoordsB[0] && coords4[1] == neighbor4CoordsB[1]);
                            hasNeighbor4C = hasNeighbor4C || (coords4[0] == neighbor4CoordsC[0] && coords4[1] == neighbor4CoordsC[1]);

                            if (hasNeighbor4A || hasNeighbor4C) {
                                //enforce thermometer constraint.
                                if (checkCellsAreThermo(coords, coords2, neighbor3CoordsB, hasNeighbor4A ? neighbor4CoordsA : neighbor4CoordsC)) {
                                    return "L";
                                } else {
                                    return "";
                                }
                            } else if (hasNeighbor4B) {
                                //enforce thermometer constraint.
                                if (checkCellsAreThermo(coords, coords2, neighbor3CoordsB, neighbor4CoordsB)) {
                                    return "I";
                                } else {
                                    return "";
                                }
                            }
                        }
                    } else if (hasNeighbor3A) {
                        for (var neighbor4CellIdx = cells.length - 1; neighbor4CellIdx >= 0; neighbor4CellIdx--) {
                            var coords4 = cells[neighbor4CellIdx];
                            neighbor4CoordsA = getNeighborHexCoords(neighbor3CoordsA, (neighbor1Dir - 2 + 6) % 6);
                            neighbor4CoordsB = getNeighborHexCoords(neighbor3CoordsA, (neighbor1Dir - 1 + 6) % 6);
                            neighbor4CoordsC = getNeighborHexCoords(neighbor3CoordsA, neighbor1Dir % 6);
                            hasNeighbor4A = hasNeighbor4A || (coords4[0] == neighbor4CoordsA[0] && coords4[1] == neighbor4CoordsA[1]);
                            hasNeighbor4B = hasNeighbor4B || (coords4[0] == neighbor4CoordsB[0] && coords4[1] == neighbor4CoordsB[1]);
                            hasNeighbor4C = hasNeighbor4C || (coords4[0] == neighbor4CoordsC[0] && coords4[1] == neighbor4CoordsC[1]);

                            if (hasNeighbor4A) {
                                if (checkCellsAreThermo(coords, coords2, neighbor3CoordsA, neighbor4CoordsA)) {
                                    return "C";
                                } else {
                                    return "";
                                }
                            } else if (hasNeighbor4B) {
                                if (checkCellsAreThermo(coords, coords2, neighbor3CoordsA, neighbor4CoordsB)) {
                                    return "L";
                                } else {
                                    return "";
                                }
                            } else if (hasNeighbor4C) {
                                if (checkCellsAreThermo(coords, coords2, neighbor3CoordsA, neighbor4CoordsC)) {
                                    return "S";
                                } else {
                                    return "";
                                }
                            }
                        }
                    } else if (hasNeighbor3C) {
                        neighbor4CoordsA = getNeighborHexCoords(neighbor3CoordsC, neighbor1Dir % 6);
                        neighbor4CoordsB = getNeighborHexCoords(neighbor3CoordsC, (neighbor1Dir + 1) % 6);
                        neighbor4CoordsC = getNeighborHexCoords(neighbor3CoordsC, (neighbor1Dir + 2) % 6);
                        for (var neighbor4CellIdx = cells.length - 1; neighbor4CellIdx >= 0; neighbor4CellIdx--) {
                            var coords4 = cells[neighbor4CellIdx];
                            hasNeighbor4A = hasNeighbor4A || (coords4[0] == neighbor4CoordsA[0] && coords4[1] == neighbor4CoordsA[1]);
                            hasNeighbor4B = hasNeighbor4B || (coords4[0] == neighbor4CoordsB[0] && coords4[1] == neighbor4CoordsB[1]);
                            hasNeighbor4C = hasNeighbor4C || (coords4[0] == neighbor4CoordsC[0] && coords4[1] == neighbor4CoordsC[1]);

                            if (hasNeighbor4A) {
                                if (checkCellsAreThermo(coords, coords2, neighbor3CoordsC, neighbor4CoordsA)) {
                                    return "S";
                                } else {
                                    return "";
                                }
                            } else if (hasNeighbor4B) {
                                if (checkCellsAreThermo(coords, coords2, neighbor3CoordsC, neighbor4CoordsB)) {
                                    return "L";
                                } else {
                                    return "";
                                }
                            } else if (hasNeighbor4C) {
                                if (checkCellsAreThermo(coords, coords2, neighbor3CoordsC, neighbor4CoordsC)) {
                                    return "C";
                                } else {
                                    return "";
                                }
                            }
                        }
                    }

                }
            }
        }
    }
    //function solveBoard() {
    //    var errorMsg;
    //    $.ajax({
    //        async: false,
    //        url: '/?handler=Solve',
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
    //            errorMsg = result.item1;
    //        },
    //        error: function (result) {
    //            alert(result);
    //        }
    //    });
    //    return errorMsg;
    //}
    var layerCells = [];
    var layerPossibleShapes = [];
    function determineLayerCells() {
        layerCells = [];
        layerPossibleShapes = [];
        for (var iLayer = 0; iLayer < board.length; iLayer++) {
            var cellList = [];
            for (var y = 0; y < board[iLayer][0].length; ++y) {
                for (var x = 0; x < board[iLayer].length; ++x) {
                    if (board[iLayer][x][y].hexTypeID > 1) {
                        cellList.push([x, y]);
                    }
                }
            }
            layerCells[iLayer] = cellList;
            var possibleShapes = [];
            for (var cell1idx = 0; cell1idx < cellList.length; cell1idx++) {
                for (var cell2idx = cell1idx + 1; cell2idx < cellList.length; cell2idx++) {
                    for (var cell3idx = cell2idx + 1; cell3idx < cellList.length; cell3idx++) {
                        for (var cell4idx = cell3idx + 1; cell4idx < cellList.length; cell4idx++) {
                            possibleShapes.push([cellList[cell1idx], cellList[cell2idx], cellList[cell3idx], cellList[cell4idx]]);
                        }
                    }
                }
            }

            for (var i = possibleShapes.length - 1; i >= 0; i--) {
                var possibleCells = possibleShapes[i];

                //Remove from list candidates with cells that are not adjacent to all the rest
                var cells = [];
                cells.push(possibleCells.shift());
                //for each cell A in connectedCellIdxs, loop through cellIdxs and see if any matches A's neighbors.  Do this up to three times.
                for (var counter = 0; counter < 3; counter++) {
                    for (var cellIdxA = 0; cellIdxA < cells.length; cellIdxA++) {
                        var cellACoords = cells[cellIdxA];
                        //get candidate to see if it is a neighbor
                        for (var cellIdxB = possibleCells.length - 1; cellIdxB >= 0; cellIdxB--) {
                            var cellBCoords = possibleCells[cellIdxB];
                            for (var dir = 0; dir < 6; dir++) {
                                var neighborCoords = getNeighborHexCoords(cellACoords, dir);
                                if (neighborCoords[0] == cellBCoords[0] && neighborCoords[1] == cellBCoords[1]) {
                                    //found the match. stop looking in neighbors.
                                    cells.push(possibleCells[cellIdxB]);
                                    possibleCells.splice(cellIdxB, 1);
                                    break;
                                }
                            }
                        }
                    }
                }
                if (cells.length != 4) {
                    possibleShapes.splice(i, 1);
                    //skip this shape, keep going on future possible shapes.
                    continue;
                } else {
                    possibleShapes[i] = cells;
                }

                //remove from candidates those that break the 'three cell group' rule, including with their neighbors.
                //for each cell, get adjacent cells two at a time.  for each adjacent cell, if both are in the list of cells, this is an invalid shape.
                var foundConflict = false;
                for (var cell of cells) {
                    for (var dir = 0; dir < 6; dir++) {
                        var firstCoords = getNeighborHexCoords(cell, dir);
                        for (var cell2 of cells) {
                            if (firstCoords[0] == cell2[0] && firstCoords[1] == cell2[1]) {
                                //this neighbor is in the shape.
                                var secondCoords = getNeighborHexCoords(cell, (dir + 1) % 6);
                                for (var cell3 of cells) {
                                    if (secondCoords[0] == cell3[0] && secondCoords[1] == cell3[1]) {
                                        //this neighbor is in the shape too.
                                        possibleShapes.splice(i, 1);
                                        foundConflict = true;
                                        break;
                                    }
                                }
                            }
                            if (foundConflict) {
                                break;
                            }
                        }
                        if (foundConflict) {
                            break;
                        }
                    }
                    if (foundConflict) {
                        break;
                    }
                }
            }
            layerPossibleShapes[iLayer] = possibleShapes;
        }
    }
    function solveBoard() {
        //returns Error message or empty string.

        //for each area:  build list of possible combinations of 4 cells in this area.
        //                Remove from list candidates with cells that are not adjacent to all the rest (use fill mechanic and ensure there are 4 affected cells)
        //                Remove from list candidates with three cells that touch, including bordering "on" cells from other areas.
        //                Detect the shape of the 4 cells
        //                    remove candidates which touch a bordering "on" cell with only one shape, which matches this candidate's shape.
        //                Remove from list candidates that don't include cells already marked "on".
        //                check adjacency: start by removing candidates which only border "off" cells.
        //                for each cell, save the list of possible shapes.
        //                    if it is in all possible shapes, mark as "on".
        //                    if it is in no possible shapes, mark as "off".
        //                    display possible shapes in each cell.
        //check whole board for regions of filled in cells which are disconnected from other areas/regions of filled in cells.
        //check adjacency: for adjacent regions that are completely surrounded by empties except 1 cell, mark that cell on.
        //if possible shape causes a region that is fully disconnected from other regions, it is invalid.
        //todo: When testing possible shapes, as long as there is only one adjacent unknown cell, keep filling it in in the flatboard.  Then, run a check that flatboard is legal.

        var flatBoard = getFlattenedBoard();

        //save list of cells which must be filled in for possible shape to be valid.
        var restrictedRegionCells = [];

        for (var connectedRegion of getConnectedRegions()) {
            //get adjacent (not within region) cells
            var adjacentUnknownCells = getAdjacentUnknownCells(connectedRegion, flatBoard);

            //check whether there is only one potential way out (i.e. all surrounding cells are off except for one unknown)
            if (adjacentUnknownCells.length == 1) {
                registerBoardChange();
                setBoardHexType(adjacentUnknownCells[0], -1, 2);
            } else if (adjacentUnknownCells.length == 0) {
                //invalid: at least one region is surrounded.
                if (getConnectedRegions().length == 1) {
                    return SOLVE_SUCCESS_MSG;
                } else {
                    return "Cannot connect region containing (" + connectedRegion[0] + ")";
                }
            } else {
                //see if unknown cells are in the same region.  If so, restrict possible shapes in that region to those that include at least one of these unknown cells.
                var layerIdx = -1;
                for (var unknownCell of adjacentUnknownCells) {
                    var newLayerIdx = getBoardLayerIdx(unknownCell);
                    if (layerIdx == -1) {
                        layerIdx = newLayerIdx;
                    } else if (layerIdx != newLayerIdx) {
                        layerIdx = -1;
                        break;
                    }
                }
                if (layerIdx != -1) {
                    if (!restrictedRegionCells[layerIdx]) {
                        restrictedRegionCells[layerIdx] = [];
                    }
                    restrictedRegionCells[layerIdx].push(adjacentUnknownCells);
                    //for (var cellcoords of adjacentUnknownCells) {
                    //    setBoardHexType(cellcoords, 49, 6);
                    //}
                }
            }
        }

        var newBoardDisplay = [];
        for (var x = 0; x < COLS; ++x) {
            newBoardDisplay[x] = [];
            for (var y = 0; y < ROWS; ++y) {
                newBoardDisplay[x][y] = "";
            }
        }

        for (var iLayer = 0; iLayer < board.length; iLayer++) {
            var cellList = [];
            var possibleShapeCount = {};
            //var cellBorderList = [];
            var boardJSON = getBoardJSON();
            var changedBoard = false;

            var onCells = [];

            for (var cellCoords of layerCells[iLayer]) {
                let cell = board[iLayer][cellCoords[0]][cellCoords[1]];
                if (cell.hexTypeID > 1) {
                    //check for conflicts with the 3-cell group rule.
                    //todo maybe: change logic to only operate if a cell is on: detect other cells that are on, then set adjacent cells to off.  This is for better performance with low number of on cells.
                    for (var dir = 0; dir < 6; dir++) {
                        var firstCoords = getNeighborHexCoords(cellCoords, dir);
                        if (flatBoard[firstCoords[0]][firstCoords[1]].hexTypeID == 2) {
                            var secondCoords = getNeighborHexCoords(cellCoords, (dir + 1) % 6);
                            if (flatBoard[secondCoords[0]][secondCoords[1]].hexTypeID == 2) {
                                changedBoard = true;
                                setBoardHexType(cellCoords, iLayer, 1);
                                break;
                            }
                        }
                    }
                    ////enforce the odd/even parity rule.  
                    ////if a cell is on, turn off all neighbors which are of the same parity.
                    //if (cell.hexTypeID == 2 && cell.number) {
                    //    let parity = cell.number % 2;
                    //    for (var dir = 0; dir < 6; dir++) {
                    //        var neighborCoords = getNeighborHexCoords(cellCoords, dir);
                    //        var neighborCell = flatBoard[neighborCoords[0]][neighborCoords[1]];
                    //        if (neighborCell.number && neighborCell.number % 2 == parity) {
                    //            changedBoard = true;
                    //            setBoardHexType(neighborCoords, -1, 1);
                    //        }
                    //    }
                    //}

                    if (cell.hexTypeID > 1) {
                        cellList.push(cellCoords);
                        possibleShapeCount[cellCoords] = 0;
                        if (cell.hexTypeID == 2) {
                            //onCellIDs.push(cellList.length - 1);
                            onCells.push(cellCoords);
                        }
                    }
                }
            }

            if (changedBoard) {
                registerBoardChange(boardJSON);
            }
            if (cellList.length < 4) {
                if (cellList.length > 0) {
                    return "Error: area " + (iLayer + 1) + " (containing " + getLayerCoords(iLayer) + ") too small";
                }
                continue;
            }

            var possibleShapes = JSON.parse(JSON.stringify(layerPossibleShapes[iLayer]));
            for (var i = possibleShapes.length - 1; i >= 0; i--) {
                //ensure it does not have 'off' cells, which could show up due to caching the shapes.
                var foundConflict = false;
                for (var possibleCell of possibleShapes[i]) {
                    if (flatBoard[possibleCell[0]][possibleCell[1]].hexTypeID == 1) {
                        possibleShapes.splice(i, 1);
                        foundConflict = true;
                        break;
                    }
                }
                if (foundConflict) {
                    continue;
                }

                //ensure possible shapes contain all cells in onCells, and at least one from restrictedRegionCells
                var containsOnCells = true;

                for (var onCell of onCells) {
                    var foundOnCell = false;
                    for (var possibleCell of possibleShapes[i]) {
                        if (possibleCell[0] == onCell[0] && possibleCell[1] == onCell[1]) {
                            foundOnCell = true;
                            break;
                        }
                    }
                    if (foundOnCell == false) {
                        containsOnCells = false;
                        break;
                    }
                }
                if (containsOnCells) {
                    var containsRestrictedRegionCell = true;
                    if (restrictedRegionCells[iLayer]) {
                        for (var restrictedRegionAdjacentRegion of restrictedRegionCells[iLayer]) {
                            containsRestrictedRegionCell = false;
                            for (var restrictedRegionCell of restrictedRegionAdjacentRegion) {
                                for (var possibleCell of possibleShapes[i]) {
                                    if (possibleCell[0] == restrictedRegionCell[0] && possibleCell[1] == restrictedRegionCell[1]) {
                                        containsRestrictedRegionCell = true;
                                        break;
                                    }
                                }
                                if (containsRestrictedRegionCell) {
                                    break;
                                }
                            }
                            if (!containsRestrictedRegionCell) {
                                //this adjacent region is not satisfied, therefore the shape as a whole is invalid.
                                break;
                            }

                        }
                    }
                    if (!containsRestrictedRegionCell) {
                        possibleShapes.splice(i, 1);
                    }
                } else {
                    possibleShapes.splice(i, 1);
                }
            }

            /*old version
             * var possibleShapes = [];
            for (var cell1idx = 0; cell1idx < cellList.length; cell1idx++) {
                for (var cell2idx = cell1idx + 1; cell2idx < cellList.length; cell2idx++) {
                    for (var cell3idx = cell2idx + 1; cell3idx < cellList.length; cell3idx++) {
                        for (var cell4idx = cell3idx + 1; cell4idx < cellList.length; cell4idx++) {
                            //ensure it contains all cells in onCellIDs, and at least one from restrictedRegionCells
                            var containsOnCells = true;
                            for (var onCellID of onCellIDs) {
                                if ([cell1idx, cell2idx, cell3idx, cell4idx].indexOf(onCellID) == -1) {
                                    containsOnCells = false;
                                    break;
                                }
                            }
                            if (containsOnCells) {
                                var containsRestrictedRegionCell = true;
                                if (restrictedRegionCells[iLayer]) {
                                    for (var restrictedRegionAdjacentRegion of restrictedRegionCells[iLayer]) {
                                        containsRestrictedRegionCell = false;
                                        for (var restrictedRegionCell of restrictedRegionAdjacentRegion) {
                                            for (var cellID of [cell1idx, cell2idx, cell3idx, cell4idx]) {
                                                if (cellList[cellID][0] == restrictedRegionCell[0] && cellList[cellID][1] == restrictedRegionCell[1]) {
                                                    containsRestrictedRegionCell = true;
                                                    break;
                                                }
                                            }
                                            if (containsRestrictedRegionCell) {
                                                break;
                                            }
                                        }
                                        if (!containsRestrictedRegionCell) {
                                            //this adjacent region is not satisfied, therefore the shape as a whole is invalid.
                                            break;
                                        }
             
                                    }
                                }
                                if (containsRestrictedRegionCell) {
                                    possibleShapes.push([cellList[cell1idx], cellList[cell2idx], cellList[cell3idx], cellList[cell4idx]]);
                                }
                            }
                        }
                    }
                }
            }
             * */

            for (var i = possibleShapes.length - 1; i >= 0; i--) {
                var possibleCells = possibleShapes[i];

                //Remove from list candidates with cells that are not adjacent to all the rest
                var cells = [];
                cells.push(possibleCells.shift());
                //for each cell A in connectedCellIdxs, loop through cellIdxs and see if any matches A's neighbors.  Do this up to three times.
                for (var counter = 0; counter < 3; counter++) {
                    for (var cellIdxA = 0; cellIdxA < cells.length; cellIdxA++) {
                        var cellACoords = cells[cellIdxA];
                        //get candidate to see if it is a neighbor
                        for (var cellIdxB = possibleCells.length - 1; cellIdxB >= 0; cellIdxB--) {
                            var cellBCoords = possibleCells[cellIdxB];
                            for (var dir = 0; dir < 6; dir++) {
                                var neighborCoords = getNeighborHexCoords(cellACoords, dir);
                                if (neighborCoords[0] == cellBCoords[0] && neighborCoords[1] == cellBCoords[1]) {
                                    //found the match. stop looking in neighbors.

                                    ////enforce odd/even parity.
                                    //let cellA = board[iLayer][cellACoords[0]][cellACoords[1]];
                                    //if (cellA.number) {
                                    //    let cellB = board[iLayer][cellBCoords[0]][cellBCoords[1]];
                                    //    if (cellB.number && cellB.number % 2 != cellA.number % 2) {
                                    //        cells.push(possibleCells[cellIdxB]);
                                    //    }
                                    //}
                                    cells.push(possibleCells[cellIdxB]);
                                    possibleCells.splice(cellIdxB, 1);
                                    break;
                                }
                            }
                        }
                    }
                }
                if (cells.length != 4) {
                    possibleShapes.splice(i, 1);
                    //skip this shape, keep going on future possible shapes.
                    continue;
                } else {
                    possibleShapes[i] = cells;
                }

                //remove from candidates those that break the 'three cell group' rule, including with their neighbors.
                var possibleFlatBoard = getLayerCopy(flatBoard);
                for (var coords of cellList) {
                    possibleFlatBoard[coords[0]][coords[1]].hexTypeID = 1;
                }
                for (var coords of cells) {
                    possibleFlatBoard[coords[0]][coords[1]].hexTypeID = 2;
                }
                //var adjacentUnknownCells = [];
                //var adjacentOnCells = [];
                var foundConflict = false;
                for (var cellIdx = cells.length - 1; cellIdx >= 0; cellIdx--) {
                    var coords = cells[cellIdx];
                    //var foundConflict = false;
                    for (var dir = 0; dir < 6; dir++) {
                        var firstCoords = getNeighborHexCoords(coords, dir);
                        if (possibleFlatBoard[firstCoords[0]][firstCoords[1]].hexTypeID == 2) {
                            var secondCoords = getNeighborHexCoords(coords, (dir + 1) % 6);
                            if (possibleFlatBoard[secondCoords[0]][secondCoords[1]].hexTypeID == 2) {

                                foundConflict = true;
                                break;
                            }
                        }
                    }
                    if (foundConflict) {
                        possibleShapes.splice(i, 1);
                        break;
                    }
                }
                if (foundConflict) {
                    //skip this shape, keep going on future possible shapes.
                    continue;
                }

                //check whether making this shape disconnects it from other regions.
                var connectedRegion = getFillList(cells[0], 2, possibleFlatBoard);
                if (getAdjacentUnknownCells(connectedRegion, possibleFlatBoard).length == 0) {
                    if (getConnectedRegions(possibleFlatBoard).length > 1) {
                        possibleShapes.splice(i, 1);
                        continue;
                    }
                }

                //if not, finally check whether there are other regions that must be connected (otherwise, the board may be solved successfully)
                //for now, just check for separate regions.  Later if needed we can upgrade to looking for areas without filled in shapes, etc.
                //if (getConnectedRegions().length > 1) {
                //    possibleShapes.splice(i, 1);
                //    continue;
                //}

                ////check whether there is only one potential way out (all surrounding cells are off except for one unknown)
                //adjacentUnknownCells = dedupeArray(adjacentUnknownCells);
                //if (adjacentOnCells.length == 0 && adjacentUnknownCells.length == 1) {
                //    registerBoardChange();
                //    setBoardHexType(adjacentUnknownCells[0], -1, 2);
                //}

                //Detect the shape of the 4 cells.
                /*
                    * Start at one end by identifying a cell with only 1 neighbor.
                    * Keep track of that neighbors direction.
                    * from the neighbor, look in directions -1, 0 and +1 of the previous direction
                    * if cells in -1 and +1 are filled in, this is a Y.
                    * if cell 0 is filled in, this is an L (if -1 or +1 next) or I (if 0 next)
                    * if cell -1 or +1 is filled in, this is an L (if 0 next), C (if again -1 or +1) or S (if changing direction, e.g. +1 or -1).
                    */
                //get the shape.  identify a cell which is on the end: 1 neighbor.

                var shapeName = getShape(cells);

                if (shapeName == "") {
                    possibleShapes.splice(i, 1);
                    continue;
                    //return "Couldn't detect shape for layer " + (iLayer + 1);
                }

                //remove as candidate if shape matches an adjacent "on" cell from different area with this exact shape.
                for (var cellCoords of cells) {
                    for (var dir = 0; dir < 6; dir++) {
                        var neighborCoords = getNeighborHexCoords(cellCoords, dir);
                        if (getBoardValue(neighborCoords) == 2
                            && getBoardLayerIdx(neighborCoords) != iLayer
                            && boardDisplay[neighborCoords[0]][neighborCoords[1]] == shapeName) {
                            possibleShapes.splice(i, 1);
                            foundConflict = true;
                            break;
                        }
                    }
                    if (foundConflict) {
                        //skip this shape, keep going on future possible shapes.
                        break;
                    }
                }

                if (foundConflict) {
                    //skip this shape, keep going on future possible shapes.
                    continue;
                }

                ////enforce consecutive rule: remove the candidate if it breaks the consecutive rule: all numbers must form a run of length 4, e.g. 1234, 6789 (not in order).  max-min should be 3.
                //let maxCellNumber = 0;
                //let minCellNumber = 10000;
                //for (var cellCoords of cells) {
                //    let cell = board[iLayer][cellCoords[0]][cellCoords[1]];
                //    if (cell.number) {
                //        if (cell.number > maxCellNumber) {
                //            maxCellNumber = cell.number;
                //        }
                //        if (cell.number < minCellNumber) {
                //            minCellNumber = cell.number;
                //        }
                //    }
                //}
                //if (maxCellNumber > 0) {//there is at least one cell with a number.
                //    if (maxCellNumber - minCellNumber > 3) {
                //        possibleShapes.splice(i, 1);
                //        continue;
                //    }
                //}




                if (foundConflict) {
                    //skip this shape, keep going on future possible shapes.
                    continue;
                }

                //display candidate shapes on board.
                for (var cellCoords of cells) {
                    var shapeDesc = newBoardDisplay[cellCoords[0]][cellCoords[1]];
                    if (shapeDesc.indexOf(shapeName) == -1) {
                        newBoardDisplay[cellCoords[0]][cellCoords[1]] = (shapeDesc + shapeName).split('').sort().join('');
                    }
                }

                //increment total shapes this cell can belong to.
                for (var cellIdx = 0; cellIdx < possibleShapes[i].length; cellIdx++) {
                    possibleShapeCount[possibleShapes[i][cellIdx]] += 1;
                }
            }

            if (possibleShapes.length == 0) {
                return "Error: area " + (iLayer + 1) + " (containing " + getLayerCoords(iLayer) + ") has no possible shapes.";
                //continue;
            }

            //    if it is in all possible shapes, mark as "on".
            //    if it is in no possible shapes, mark as "off".
            if (changedBoard) {
                //re-get latest, after previous change.
                boardJSON = getBoardJSON();
                changedBoard = false;
            }
            for (var cellIdx = 0; cellIdx < cellList.length; cellIdx++) {
                var shapeCount = possibleShapeCount[cellList[cellIdx]];
                var x = cellList[cellIdx][0];
                var y = cellList[cellIdx][1];
                //boardDisplay[x][y] = shapeCount.toString();
                if (shapeCount == 0 && board[iLayer][x][y].hexTypeID != 1) {
                    changedBoard = true;
                    setBoardHexType([x, y], iLayer, 1);
                }
                if (shapeCount == possibleShapes.length && board[iLayer][x][y].hexTypeID != 2) {
                    changedBoard = true;
                    setBoardHexType([x, y], iLayer, 2);
                }
            }
            if (changedBoard) {
                registerBoardChange(boardJSON);
            }
        }
        boardDisplay = newBoardDisplay;

        if (JSON.stringify(flatBoard) != JSON.stringify(getFlattenedBoard())) {
            return solveBoard();
        } else {
            return "";
        }
    }
    function setStarBattleCellGroups(starCount) {
        setSudokuCellGroups(true);
        for (var x = 0; x < COLS; ++x) {
            for (var y = 0; y < ROWS; ++y) {
                var cell = getBoardCell([x, y]);
                if (cell) {
                    for (let group of cell.sudokuCellGroups) {
                        group.totalValue = starCount;
                    }
                    //except just 1 for the adjacent cells.
                    cell.sudokuCellGroups[0].totalValue = 1;
                }
            }
        }
    }
    function makeSudokuCellGroup(totalValue, cellCoords) {
        return { totalValue: totalValue, cellCoords: cellCoords };
    }
    function setSudokuCellGroups(useKingsMove) {
        //todo: do better.  from top, go south and catalog groups.  from top and left, go southeast and catalog groups. from top and right, go southwest and catalog groups.  Use layers to catalog groups.
        for (var x = 0; x < COLS; ++x) {
            for (var y = 0; y < ROWS; ++y) {
                var cell = getBoardCell([x, y]);
                if (cell) {
                    cell.sudokuCellGroups = [];

                    if (useKingsMove) {
                        let cellCoordsList = [];
                        for (let neighborCoords of getAllNeighborHexCoords([x, y])) {
                            if (getBoardLayerIdx(neighborCoords) > -1) {
                                cellCoordsList.push(neighborCoords);
                            }
                        }
                        cell.sudokuCellGroups.push(makeSudokuCellGroup(-1, cellCoordsList));
                    }

                    //get sudokugroups for cages, based on layers.  TotalValue is optional, and will act as a simple non-repeating governor if omitted.
                    var layerIdx = getBoardLayerIdx([x, y]);
                    for (let lowerLayerIdx = layerIdx - 1; lowerLayerIdx >= 0; lowerLayerIdx--) {
                        let lowerCell = board[lowerLayerIdx][x][y];
                        if (lowerCell.hexTypeID > 0) {
                            //we found a cage here.  Use the value and cell list.
                            let cellCoordsList = [];
                            for (let lowerlayerCell of getBoardLayerCells(lowerLayerIdx)) {
                                if (lowerlayerCell !== lowerCell) {
                                    cellCoordsList.push([lowerlayerCell.x, lowerlayerCell.y]);
                                }
                            }
                            cell.sudokuCellGroups.push(makeSudokuCellGroup(Number(lowerCell.number), cellCoordsList));
                        }
                    }

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
                                } else {
                                    //stop looking when passing empty cells.  Remove this to allow gaps within a line while retaining the set.
                                    break;
                                }
                            }
                        }
                        cell.sudokuCellGroups.push(makeSudokuCellGroup(0, axisCoords));
                    }
                }

                //on solving, ensure that values can add up to the cage total.
                //todo: reflect the fact that it's in a cage (or 2 or 3).  Draw lower layers outlines lightly?
                //todo: at solve time, eliminate candidates when they breach the minimum/maximum possibles.
            }
        }
    }
    function encodeCoords(coords) {
        return coords[0] * 1000 + coords[1];
    }
    function decodeCoords(coordsInt) {
        return [Math.floor(coordsInt / 1000), coordsInt % 1000]
    }
    //todo: when filling in to make a full grid, fill in in a random order to make use of potentialNumbers.  May need to re-enable proactive potential number settings.
    function setSudokuPotentialNumbers(flatBoard, hexCoordsX, hexCoordsY, maxNumber) {
        var cell = flatBoard[hexCoordsX][hexCoordsY];
        cell.potentialNumbers = [];

        //for (var coordsList of cell.sudokuCellGroups) {
        //    if (coordsList.length + 1 < maxNumber) {
        //        maxNumber = coordsList.length + 1;
        //    }
        //}


        for (let i = 1; i <= maxNumber; i++) {
            cell.potentialNumbers[i] = true;
        }

        ////Check value in neighbor hexes, eliminate some possibilities. enforce odd/even parity
        //if (cell.hexTypeID == 2) {
        //    for (let neighborCoords of getAllNeighborHexCoords([hexCoordsX, hexCoordsY])) {
        //        let neighborCell = flatBoard[neighborCoords[0]][neighborCoords[1]];
        //        if (neighborCell && neighborCell.hexTypeID == 2 && neighborCell.number) {
        //            //            ////eliminate consecutive numbers (+ or - 1)
        //            //            //let n = neighborCell.number;
        //            //            //if (cell.potentialNumbers[n - 1]) {
        //            //            //    cell.potentialNumbers[n - 1] = false;
        //            //            //}
        //            //            //if (cell.potentialNumbers[n + 1]) {
        //            //            //    cell.potentialNumbers[n + 1] = false;
        //            //            //}
        //
        //            let parity = neighborCell.number % 2;
        //            for (let i = 1; i <= maxNumber; i++) {
        //                if (parity == i % 2) {//both even or both odd
        //                    cell.potentialNumbers[i] = false;
        //                }
        //            }
        //        }
        //    }
        //}


        ////use the cellgroup to eliminate dupluicates, value as a max to eliminate candidates. 
        //for (var cellGroup of cell.sudokuCellGroups) {
        //    for (var coords of cellGroup.cellCoords) {
        //        var cell2 = flatBoard[coords[0]][coords[1]];
        //        if (cell2.number) {
        //            cell.potentialNumbers[cell2.number] = false;
        //        }
        //    }
        //    if (cellGroup.totalValue) {
        //        for (let i = cellGroup.totalValue + 1; i <= maxNumber; i++) {
        //            cell.potentialNumbers[i] = false;
        //        }
        //    }
        //}
        //make us of thermometers.  This will check the previous cell's potential numbers and ensure it's higher, then check next cells potential numbers and ensure it's lower.
        for (let thermo of thermos) {
            for (let tidx = 0; tidx < thermo.length; tidx++) {
                if (thermo[tidx][0] == hexCoordsX && thermo[tidx][1] == hexCoordsY) {
                    //check previous cell to ensure that lowest potential numbers there are 
                    let lowestPotentialNumber = 1;
                    if (tidx > 0) {
                        let previousThermoCell = flatBoard[thermo[tidx - 1][0]][thermo[tidx - 1][1]];
                        if (previousThermoCell.number) {
                            lowestPotentialNumber = previousThermoCell.number + 1;
                        }
                    }
                    let highestPotentialNumber = maxNumber;
                    if (tidx < thermo.length - 1) {
                        let nextThermoCell = flatBoard[thermo[tidx + 1][0]][thermo[tidx + 1][1]];
                        if (nextThermoCell.number) {
                            highestPotentialNumber = nextThermoCell.number + 1;
                        }
                    }
                    for (let i = 1; i <= maxNumber; i++) {
                        if (i < lowestPotentialNumber || i > highestPotentialNumber) {
                            cell.potentialNumbers[i] = false;
                        }
                    }
                    break;
                }
            }
        }

        //use the cellgroup totalvalue to eliminate candidates. Use groups as cages with total values.
        for (var cellgroup of cell.sudokuCellGroups) {
            let currenttotal = 0;
            let cellsempty = 0;
            for (var coords of cellgroup.cellCoords) {
                var cell2 = flatBoard[coords[0]][coords[1]];
                if (cell2.number) {
                    currenttotal += Number(cell2.number);
                    cell.potentialNumbers[cell2.number] = false;
                } else {
                    cellsempty++;
                }
            }
            if (cellgroup.totalValue) {
                for (let i = 1; i <= maxNumber; i++) {
                    //todo: make better use of cellsempty, calculating differently when there are is more than 1.  for example, get the actual minimumvalue for that cell, and ensure we don't use the same number twice.
                    //todo: allow cages to have numbers higher than 9.
                    if (cellsempty == 0 && currenttotal + i != cellgroup.totalValue) {
                        cell.potentialNumbers[i] = false;
                    } else if (cellsempty > 0 && currenttotal + i > cellgroup.totalValue) {
                        cell.potentialNumbers[i] = false;
                    }
                }
            }
        }
    }
    function getNumStarsInGroup(flatBoard, coordsList) {
        let seenStars = 0;
        for (let coords of coordsList) {
            if (flatBoard[coords[0]][coords[1]].number == 2) {
                seenStars++;
            }
        }
        return seenStars;
    }
    function verifySudoku(flatBoard, checkHexCoordsX, checkHexCoordsY, checkNumber, maxNumber) {
        var cell = flatBoard[checkHexCoordsX][checkHexCoordsY];
        if (cell.potentialNumbers == null) {
            setSudokuPotentialNumbers(flatBoard, checkHexCoordsX, checkHexCoordsY, maxNumber)
        }

        return cell.potentialNumbers[checkNumber];

        //var cell = flatBoard[checkHexCoordsX][checkHexCoordsY];
        //if (cell) {
        //var maxNumber = 9000;
        //for (var coordsList of cell.sudokuCellGroups) {
        //    if (coordsList.length + 1 < maxNumber) {
        //        maxNumber = coordsList.length + 1;
        //    }
        //}
        //if (checkNumber > maxNumber) {
        //    return checkNumber + " is greater than max value of " + maxNumber;
        //}
        //var seenValues = new Set();
        for (let coordsList of flatBoard[checkHexCoordsX][checkHexCoordsY].sudokuCellGroups) {
            for (let coords of coordsList) {
                //var cell2 = flatBoard[coords[0]][coords[1]];
                //seenValues.add(cell2.number);
                if (flatBoard[coords[0]][coords[1]].number == checkNumber) {
                    return false;//"(" + checkHexCoords + ") and (" + coords + ") both contain " + checkNumber;
                }
            }
            //for (const [x, y] of coordsList) {
            //    //var cell2 = flatBoard[coords[0]][coords[1]];
            //    //seenValues.add(cell2.number);
            //    if (flatBoard[x][y].number == checkNumber) {
            //        return false;//"(" + checkHexCoords + ") and (" + coords + ") both contain " + checkNumber;
            //    }
            //}

        }
        //} else {
        //return "invalid";//checkHexCoords + " is not a valid cell";
        //}
        return true;//no error.
    }
    function setCellTestNumber(flatBoard, checkHexCoordsX, checkHexCoordsY, testNumber) {
        //set the actual number.  go through groups and reduce potentialnumbers from them.  If they only have one potential number left, set it (recursively);
        var cell = flatBoard[checkHexCoordsX][checkHexCoordsY];
        cell.number = testNumber;
        //go through and set all seen cells to not have this.
        //for (var coordsList of cell.sudokuCellGroups) {
        //    for (var coords of coordsList) {


        //todo: mix up the order in which cells are added (maybe random, which would give random grids), then try reincluding this.
        //for (let coordsListIdx = cell.sudokuCellGroups.length - 1; coordsListIdx >= 0; coordsListIdx--) {
        //    for (let coordsIdx = cell.sudokuCellGroups[coordsListIdx].length - 1; coordsIdx >= 0; coordsIdx--) {
        //        let coords = cell.sudokuCellGroups[coordsListIdx][coordsIdx];
        //        let seenCell = flatBoard[coords[0]][coords[1]];
        //        if (!seenCell.number && seenCell.potentialNumbers) {
        //            seenCell.potentialNumbers[testNumber] = false;
        //            let potentialNCount = 0;
        //            let seenCellNumber = 0;
        //            for (var k = 1; k <= 9; k++) {
        //                if (seenCell.potentialNumbers[k]) {
        //                    seenCellNumber = k;
        //                    potentialNCount++;
        //                }
        //            }
        //            if (potentialNCount == 1) {
        //                setCellTestNumber(flatboard, coords[0], coords[1], seenCellNumber);
        //            }
        //        }
        //    }
        //}
    }
    function solveSudoku() {
        //verify that each axis has place where 1-N can go.
        var boardJSON = getBoardJSON();
        var flatBoard = getFlattenedBoard();
        for (var x = 0; x < COLS; ++x) {
            for (var y = 0; y < ROWS; ++y) {
                var cell = flatBoard[x][y];
                if (cell.hexTypeID > 0) {
                    var seenCoords = [];
                    var seenValues = new Set();
                    for (var i = 0; i < 3; i++) {
                        var axisCoords = [];
                        //for each direction
                        for (var i2 = 0; i2 < 4; i2 += 3) {
                            var x2 = x;
                            var y2 = y;
                            //travel to the edge of the board, cataloging cells on the way.
                            while (true) {
                                var neighborcoords = getNeighborHexCoords([x2, y2], i + i2);
                                x2 = neighborcoords[0];
                                y2 = neighborcoords[1];
                                if (!inBoard(x2, y2)) {
                                    break;
                                }
                                var cell2 = flatBoard[x2][y2];
                                if (cell2.hexTypeID > 0) {
                                    axisCoords.push([x2, y2]);
                                    if (cell2.number) {
                                        seenValues.add(cell2.number);
                                        if (cell2.number == cell.number) {
                                            return "Problem: (" + x + "," + y + ") and (" + x2 + "," + y2 + ") both contain " + cell.number;
                                        }
                                    }
                                } else {
                                    break;
                                }
                            }
                        }
                        seenCoords.push(axisCoords);
                    }
                    var maxValue = 9;
                    //for (var coordsList of seenCoords) {
                    //    if (coordsList.length + 1 > maxValue) {
                    //        maxValue = coordsList.length + 1;
                    //    }
                    //}
                    if (cell.number) {
                        boardDisplay[x][y] = "";
                        //    if (cell.number > maxValue) {
                        //        return "Problem: (" + x + "," + y + ")'s value of " + cell.number + " is higher than the allowed " + maxValue;
                        //    }
                    }
                    else {
                        var displayVal = "";
                        for (var i = maxValue; i > 0; i--) {
                            if (!seenValues.has(i)) {
                                displayVal += i.toString();
                            }
                        }
                        if (displayVal.length == 1) {
                            setBoardNumber([x, y], -1, Number(displayVal));
                        } else {
                            boardDisplay[x][y] = displayVal;
                            if (displayVal == "") {
                                return "Problem: (" + x + "," + y + ") has no valid values.";
                            }
                        }
                    }
                    if (maxValue == 4) {
                        setBoardHexType([x, y], -1, 1)
                    } else if (maxValue == 6) {
                        setBoardHexType([x, y], -1, 2)
                    } else if (maxValue == 8) {
                        setBoardHexType([x, y], -1, 5)
                    } else if (maxValue == 9) {
                        setBoardHexType([x, y], -1, 6)
                    }
                }
            }
        }
        var newBoardJSON = getBoardJSON();
        if (newBoardJSON != boardJSON) {
            registerBoardChange();
            return solveSudoku();
        }
    }
    function solveSuguru() {
        //verify that cell doesn't touch adjacent values.
        //todo: make a full generator that recurses and fills in real possibilities.
        var boardJSON = getBoardJSON();
        var flatBoard = getFlattenedBoard();
        for (var x = 0; x < COLS; ++x) {
            for (var y = 0; y < ROWS; ++y) {
                var cell = flatBoard[x][y];
                if (cell.hexTypeID > 0) {
                    //var seenCoords = [];
                    var seenValues = new Set();


                    //get adjacent cells
                    for (let neighborCoords of getAllNeighborHexCoords([x, y])) {
                        if (getBoardLayerIdx(neighborCoords) > -1) {
                            let cell2 = flatBoard[neighborCoords[0]][neighborCoords[1]];
                            if (cell2.number) {
                                seenValues.add(cell2.number);
                                if (cell2.number == cell.number) {
                                    return "Problem with adjacency: (" + x + "," + y + ") and (" + cell2.x + "," + cell2.y + ") both contain " + cell.number;
                                }
                            }
                        }
                    }

                    let regionSize = 100;
                    //get region based on layers
                    var layerIdx = getBoardLayerIdx([x, y]);
                    for (let lowerLayerIdx = layerIdx - 1; lowerLayerIdx >= 0; lowerLayerIdx--) {
                        let lowerCell = board[lowerLayerIdx][x][y];
                        if (lowerCell.hexTypeID > 0) {
                            //we found a cage here.  Use the value and cell list.
                            let regionCells = getBoardLayerCells(lowerLayerIdx);
                            regionSize = regionCells.length;
                            for (let lowerlayerCell of regionCells) {
                                let cell2 = flatBoard[lowerlayerCell.x][lowerlayerCell.y];
                                if (cell2.number) {
                                    seenValues.add(cell2.number);
                                    if (cell2 != cell && cell2.number == cell.number) {
                                        return "Problem in region: (" + x + "," + y + ") and (" + cell2.x + "," + cell2.y + ") both contain " + cell.number;
                                    }
                                }
                            }
                        }
                    }

                    var maxValue = Math.min(9, regionSize);
                    //for (var coordsList of seenCoords) {
                    //    if (coordsList.length + 1 > maxValue) {
                    //        maxValue = coordsList.length + 1;
                    //    }
                    //}
                    if (cell.number) {
                        boardDisplay[x][y] = "";
                        //    if (cell.number > maxValue) {
                        //        return "Problem: (" + x + "," + y + ")'s value of " + cell.number + " is higher than the allowed " + maxValue;
                        //    }
                    }
                    else {
                        var displayVal = "";
                        for (var i = maxValue; i > 0; i--) {
                            if (!seenValues.has(i)) {
                                displayVal += i.toString();
                            }
                        }
                        if (displayVal.length == 1) {
                            setBoardNumber([x, y], -1, Number(displayVal));
                        } else {
                            boardDisplay[x][y] = displayVal;
                            if (displayVal == "") {
                                return "Problem: (" + x + "," + y + ") has no valid values.";
                            }
                        }
                    }
                }
            }
        }
        var newBoardJSON = getBoardJSON();
        if (newBoardJSON != boardJSON) {
            registerBoardChange();
            return solveSuguru();
        }
    }
    function breakUpLayer() {
        registerBoardChange();
        //take the drawn-on cells from current layer and make them random sizes, so we can tweak shapes until they solve better.
        var cells = [];
        for (var y = 0; y < ROWS; ++y) {
            for (var x = 0; x < COLS; ++x) {
                var layerIdx = getBoardLayerIdx([x, y]);
                if (layerIdx == currentLayerIdx) {
                    cells.push([x, y]);
                    setBoardHexType([x, y], layerIdx, 0);
                }
            }
        }
        var seedCells = [];
        //for seed count:
        //plant seed, let it grow randomly between 5-N times.  If it can't grow to at least 6 cells, remove it.
        //grow all planted areas to fill in gaps.
        var cellSeedRatio = 6;
        var seedCnt = Math.floor(cells.length / cellSeedRatio);

        var seedCounter = 0;
        for (var i = seedCnt - 1; i >= 0; i--) {
            var cell = cells.splice(randomInt(cells.length), 1)[0];
            //seedCells.push(cell);

            //grow 5 times.
            var areaCells = [cell];
            var counter = 0;
            var desiredlength = 6 + randomInt(5)
            while (areaCells.length < desiredlength && counter < 100) {
                var neighborCoords = getNeighborHexCoords(cell, randomInt(6));
                for (var cellID = 0; cellID < cells.length; cellID++) {
                    if (neighborCoords[0] == cells[cellID][0] && neighborCoords[1] == cells[cellID][1]) {
                        cell = neighborCoords;
                        areaCells.push(cell);
                        cells.splice(cellID, 1);
                        break;
                    }
                }
                counter++;
            }
            if (areaCells.length < 6) {
                //too small, remove this and put cells back into the pool.
                cells = cells.concat(areaCells);
                i++;
                seedCounter++;
                if (seedCounter > 100) {
                    break;
                }
            } else {
                seedCells = seedCells.concat(areaCells);
                for (var cell of areaCells) {
                    setBoardHexType(cell, i, i % 5 + 3);
                }
            }

        }
        //grow more to fill the gaps
        var counter = 0;
        while (cells.length > 0 && counter < 100) {
            for (var seedCellID = seedCells.length - 1; seedCellID >= 0; seedCellID--) {
                var seedCell = seedCells[seedCellID];//randomInt(seedCells.length)];
                var layerIdx = getBoardLayerIdx(seedCell);
                var neighborCoords = getNeighborHexCoords(seedCell, randomInt(6));
                for (var cellID = 0; cellID < cells.length; cellID++) {
                    if (neighborCoords[0] == cells[cellID][0] && neighborCoords[1] == cells[cellID][1]) {
                        setBoardHexType(neighborCoords, layerIdx, layerIdx % 5 + 3);
                        seedCells.push(cells.splice(cellID, 1)[0]);
                        break;
                    }
                }
            }
            counter++;
        }
    }
    function getMouseHexCoords(mouseX, mouseY) {
        //todo: limit the seach space if time is a factor
        for (var x = 0; x < board[currentLayerIdx].length; ++x) {
            for (var y = 0; y < board[currentLayerIdx][x].length; ++y) {
                setPath(x, y);
                if (ctx.isPointInPath(mouseX, mouseY)) {
                    return [x, y];
                }
            }
        }
        return [-1, -1];
    };
    function getBoardCell(hexCoords) {
        var layerIdx = getBoardLayerIdx(hexCoords);
        if (layerIdx > -1) {
            return board[layerIdx][hexCoords[0]][hexCoords[1]];
        } else {
            return undefined;
        }
    };
    function getBoardValue(hexCoords) {
        var cell = getBoardCell(hexCoords);
        if (cell) {
            return cell.hexTypeID;
        } else {
            return -1;
        }
    };
    function getBoardLayerIdx(hexCoords) {
        for (var layerIdx = LAYERCNT - 1; layerIdx >= 0; layerIdx--) {
            if (board[layerIdx][hexCoords[0]][hexCoords[1]].hexTypeID > 0) {
                return layerIdx;
            }
        }
        return -1;
    };
    function getLayerCoords(layerIdx) {
        for (var x = 0; x < COLS; ++x) {
            for (var y = 0; y < ROWS; ++y) {
                if (board[layerIdx][x][y].hexTypeID > 0) {
                    return [x, y];
                }
            }
        }
        return [-1, -1];
    };
    function getBoardLayerCells(layerIdx) {
        let cells = [];
        for (let x = 0; x < COLS; ++x) {
            for (let y = 0; y < ROWS; ++y) {
                let cell = board[layerIdx][x][y];
                if (cell.hexTypeID > 0) {
                    cells.push(cell);
                }
            }
        }
        return cells;
    };
    function setBoardHexType(hexCoords, layerIdx, hexTypeID) {
        if (layerIdx == -1) {
            layerIdx = getBoardLayerIdx(hexCoords);
        }
        var cell = board[layerIdx][hexCoords[0]][hexCoords[1]];
        if (typeof cell != 'undefined') {
            cell.hexTypeID = hexTypeID;
        } else {
            board[layerIdx][hexCoords[0]][hexCoords[1]] = new Cell(hexCoords[0], hexCoords[1], hexTypeID, 0);
        }
    };
    function setBoardNumber(hexCoords, layerIdx, number) {
        if (layerIdx == -1) {
            layerIdx = getBoardLayerIdx(hexCoords);
        }
        var cell = board[layerIdx][hexCoords[0]][hexCoords[1]];
        if (cell.number == number) {
            cell.number = 0;
        } else {
            cell.number = number;
        }
    };

    function getFlattenedBoard() {
        var flatBoard = [];
        for (var x = 0; x < COLS; ++x) {
            flatBoard[x] = [];
            for (var y = 0; y < ROWS; ++y) {
                var cell = getBoardCell([x, y]);
                var cloneCell = undefined;
                if (cell) {
                    cloneCell = getCellClone(cell);
                    cloneCell.hexTypeID = Math.max(0, cell.hexTypeID);
                } else {
                    cloneCell = new Cell(x, y, 0, 0);
                }
                flatBoard[x][y] = cloneCell;
            }
        }
        return flatBoard;
    };
    function getLayerCopy(boardLayer) {
        var layerCopy = [];
        for (var x = 0; x < COLS; ++x) {
            layerCopy[x] = [];
            for (var y = 0; y < ROWS; ++y) {
                var cell = boardLayer[x][y];
                layerCopy[x][y] = getCellClone(cell);
            }
        }
        return layerCopy;
    };
    function nudgeLayer(dir) {
        registerBoardChange();
        for (var layerIdx = 0; layerIdx < LAYERCNT; layerIdx++) {
            if (nudgeAllLayers || layerIdx == currentLayerIdx) {
                var sourcelayer = getLayerCopy(board[layerIdx]);
                for (var x = 0; x < COLS; ++x) {
                    for (var y = 0; y < ROWS; ++y) {
                        setBoardHexType([x, y], layerIdx, 0);
                    }
                }

                for (var x = 0; x < COLS; ++x) {
                    for (var y = 0; y < ROWS; ++y) {
                        //retrieve value from the opposite direction, to put it here.
                        var sourceCoords = getNeighborHexCoords([x, y], (dir + 3) % 6);
                        if (inBoard(sourceCoords[0], sourceCoords[1])) {
                            var sourceCell = sourcelayer[sourceCoords[0]][sourceCoords[1]];
                            sourceCell.x = x;
                            sourceCell.y = y;
                            board[layerIdx][x][y] = sourceCell;
                            //setBoardHexType([x, y], layerIdx, sourcelayer[sourceCoords[0]][sourceCoords[1]].hexTypeID);
                        }
                    }
                }
            }
        }
        drawBoard();
    }
    function randomInt(max) {
        //turns an integer.  Minimum value 0, maximum value max-1.
        return Math.floor(Math.random() * max);
    }

    function drawString(s, inX, inY, color, backgroundColor, maxWidth) {
        var pixels = [];
        var x = inX;
        var y = inY;
        for (var i = 0; i < s.length; i++) {
            var charObj = pixelChars[s[i].charCodeAt(0)];
            if (!charObj) {
                charObj = pixelChars["�".charCodeAt(0)];
            }

            if (maxWidth && x + charObj.width + 1 > inX + maxWidth - 2) {
                x = inX;
                y += 12;
            }
            x -= charObj.xOffset;

            var px = 3;
            var py = 0;
            for (var pi = 0; pi < charObj.pixels.length; pi++) {
                if (charObj.pixels[pi]) {
                    pixels.push([x + px, y + py]);
                }
                if (px == 3 && py == 0) {
                    px = 0;
                    py++;
                } else if (px == 6 && py == 7) {
                    py += 1;
                    px = 3;
                } else if (px == 6) {
                    px = 0;
                    py++;
                } else {
                    px++;
                }
            }
            x += charObj.xOffset + charObj.width + 1;
        }

        var stringLength = maxWidth ? maxWidth : x - inX;
        var xOffset = 0;
        if (inX + stringLength + 1 > canvasW) {
            xOffset = inX - (canvasW - stringLength - 1);
            inX = canvasW - stringLength - 1;
        }
        if (backgroundColor) {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(inX - 1.5, inY - 1.5, stringLength + 2, 12);
            ctx.strokeStyle = "black";
            ctx.strokeRect(inX - 1.5, inY - 1.5, stringLength + 2, 12);
        }
        ctx.fillStyle = color;
        for (var i = 0; i < pixels.length; i++) {
            ctx.fillRect(pixels[i][0] - xOffset, pixels[i][1], 1, 1);
        }
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
                    tool.click(e.ctrlKey, e.shiftKey);
                    handled = true;
                }
            });
            if (!handled) {
                if (keyname == 'down' || keyname == 'right') {
                    setCurrentLayerIdx(currentLayerIdx - 1);
                }
                else if (keyname == 'up' || keyname == 'left') {
                    setCurrentLayerIdx(currentLayerIdx + 1);
                }
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

    var canvas = document.getElementById('canvas');
    var canvasW = canvas.width;
    var canvasH = canvas.height;
    var linelen = 13;//6;//20;//
    var HEX_W = linelen * 1.5;
    var HEX_H = linelen * 2 / 1.1547;
    var HEX_PATH = [
        [linelen * 1.5, HEX_H],
        [linelen * 2.0, HEX_H / 2],
        [linelen * 1.5, 0],
        [linelen * 0.5, 0],
        [0, HEX_H / 2],
        [linelen * 0.5, HEX_H],
    ];

    var COLS = 33;//19;//
    var ROWS = 33;//13;//19;// //N rows, plus creating a V at the bottom.  with COLS = 11, this means 5 extra rows.
    var LAYERCNT = Number($('#inputActiveLayer').prop("max"));
    var SOLVE_SUCCESS_MSG = "You're done!";
    var board;
    var boardDisplay;
    var currentLayerIdx;
    var undoboards;//used for undo
    var redoboards;//used for redo
    var nudgeAllLayers = true;
    var showAllLayers = true;
    var drawOnExistingLayer = true;
    var selectLayerToolActive = false;
    var mergeLayerToolActive = false;
    var layerWarnings = [];
    var thermos = [];

    var description;

    var ctx = canvas.getContext('2d');
    ctx.shadowColor = 'black';

    var $canvas = $(canvas);

    $canvas.mousemove(function (e) { handleMouse(e, "move"); });
    $canvas.mousedown(function (e) { handleMouse(e, "down"); });
    $canvas.mouseup(function (e) { handleMouse(e, "up"); });

    var boardHalfW = COLS * HEX_W / 2 + HEX_H - HEX_W;
    var boardHalfH = ROWS * HEX_H;
    var transparencyGradient = ctx.createRadialGradient(boardHalfW, boardHalfH, 0, boardHalfW, boardHalfH, Math.sqrt((boardHalfW * boardHalfW) + (boardHalfH * boardHalfH)));
    var n = 0;
    while (n < ROWS * 2) {
        transparencyGradient.addColorStop(n / (ROWS * 2), n % 2 == 1 ? '#eee' : '#ccc');
        n++;
    }
    var hexTypeNames = {
        "None": "None",
        "Open": "OFF",
        "Anchor": "ON",
        "PowerEmblem": "Power Emblem",
        "DefenseEmblem": "Defense Emblem",
        "SpecialEmblem": "Special Emblem",
        "ActiveAbility": "Active Ability",
        "PassiveAbility": "Passive Ability",
        "One": "1",
        "Two": "2",
        "Three": "3",
        "Four": "4",
        "Five": "5",
        "Six": "6",
        "Seven": "7",
        "Eight": "8",
        "Nine": "9",
    };
    var hexTypes = [
        {
            name: hexTypeNames.None,
            color: transparencyGradient,
            symbol: "",
        }, {
            name: hexTypeNames.Open,
            color: "burlywood",
            symbol: "",
        }, {
            name: hexTypeNames.Anchor,
            color: "saddlebrown",
            symbol: "#",
        }, {
            name: hexTypeNames.PowerEmblem,
            color: "crimson",
            symbol: "➕",
        }, {
            name: hexTypeNames.DefenseEmblem,
            color: "dodgerblue",
            symbol: "⛨",
        }, {
            name: hexTypeNames.SpecialEmblem,
            color: "gold",
            symbol: "☇",
        }, {
            name: hexTypeNames.ActiveAbility,
            color: "lawngreen",
            symbol: "☆",
        }, {
            name: hexTypeNames.PassiveAbility,
            color: "Green",
            symbol: "★",
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
        {
            name: hexTypeNames.Seven,
            color: "Plum",
            symbol: "7",
            shortcutKey: 'key_7',
        },
        {
            name: hexTypeNames.Eight,
            color: "Plum",
            symbol: "8",
            shortcutKey: 'key_8',
        },
        {
            name: hexTypeNames.Nine,
            color: "Plum",
            symbol: "9",
            shortcutKey: 'key_9',
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
        pushToPixels(hexTypes[hexTypeMap[hexTypeNames.ActiveAbility]].symbol, "Q" +
            "  Q Q  " +
            "QQQ QQQ" +
            "Q     Q" +
            " Q   Q " +
            " Q Q Q " +
            "Q Q Q Q" +
            "QQ   QQ" +
            " ");
        pushToPixels(hexTypes[hexTypeMap[hexTypeNames.PassiveAbility]].symbol, "Q" +
            "  QQQ  " +
            "QQQQQQQ" +
            "QQQQQQQ" +
            " QQQQQ " +
            " QQQQQ " +
            "QQQ QQQ" +
            "QQ   QQ" +
            " ");
        pushToPixels(hexTypes[hexTypeMap[hexTypeNames.SpecialEmblem]].symbol, "Q" +
            "  Q QQ " +
            "  Q   Q" +
            " Q  QQ " +
            " Q Q   " +
            "  Q Q  " +
            " Q QQ  " +
            "QQQ    " +
            " ");
        pushToPixels(hexTypes[hexTypeMap[hexTypeNames.PowerEmblem]].symbol, " " +
            "  QQQ  " +
            "  Q Q  " +
            "QQQ QQQ" +
            "Q     Q" +
            "QQQ QQQ" +
            "  Q Q  " +
            "  QQQ  " +
            " ");
        pushToPixels(hexTypes[hexTypeMap[hexTypeNames.DefenseEmblem]].symbol, "Q" +
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

    var currentTool = "Pencil";
    var currentHexType = -1;
    var tools = [];
    var mouseOverTexts = [];

    var toolMargin = 5;
    var toolWidth = 16;
    var toolHeight = 16;
    var toolColumns = 3;
    var toolBoxLeft = canvasW - .5 - (toolWidth + toolMargin) * toolColumns;

    //create gradient for first tool, the solving tool.
    var solvingGradient = ctx.createLinearGradient(toolBoxLeft,
        toolMargin - .5,
        toolBoxLeft + toolWidth,
        toolMargin - .5 + toolHeight);
    solvingGradient.addColorStop(.3, "#FFD700");
    solvingGradient.addColorStop(0.4, "#DEB887");
    solvingGradient.addColorStop(0.65, "#DEB887");
    solvingGradient.addColorStop(.75, "#8b4513");

    tools.push({
        name: "Draw: Solving (s)",
        color: solvingGradient,
        symbol: "~",
        shortcutKey: "+`",
        click: function () {
            currentHexType = -1;
            drawBoard();
        },
        draw: function () {
            if (currentHexType == -1) {
                drawToolShadow(this);
            }
            drawString(this.symbol, this.x + this.width / 2 - 3.5, this.y + 3.5, "black");
        }
    });

    tools.push({
        name: "Eraser (0)",
        hexType: 0,
        color: hexTypes[0].color,
        shortcutKey: "key_0",
        click: function () {
            currentHexType = this.hexType;
            drawBoard();
        },
        draw: function () {
            if (currentHexType == this.hexType) {
                drawToolShadow(this);
            }

            //draw a white X over the gray gradient background
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + this.width, this.y + this.height);
            ctx.moveTo(this.x + this.width, this.y);
            ctx.lineTo(this.x, this.y + this.height);
            ctx.lineWidth = 3;
            ctx.strokeStyle = "white";
            ctx.stroke();
            ctx.lineWidth = 1;
            ctx.strokeStyle = "black";
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
    });

    for (var i = 1; i < hexTypes.length; i++) {
        var shortcutKey = "key_" + hexTypes[i].name;
        if (shortcutKey)

            tools.push({
                name: "Draw: " + hexTypes[i].name,// + " (" + i.toString() + ")",
                hexType: i,
                color: hexTypes[i].color,
                symbol: hexTypes[i].symbol,
                shortcutKey: hexTypes[i].shortcutKey,//"key_" + hexTypes[i].name,
                click: function () {
                    currentHexType = this.hexType;
                    if (currentTool == "Thermo") {
                        currentTool = "Pencil";
                    }
                    drawBoard();
                },
                draw: function () {
                    if (currentHexType == this.hexType) {
                        drawToolShadow(this);
                    }
                    drawString(this.symbol, this.x + this.width / 2 - 3.5, this.y + 3.5, "black");
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
    tools.push({
        name: "Clear layer (Delete)",
        color: "lightgray",
        shortcutKey: "delete",
        click: function (ctrlKey) {
            registerBoardChange();
            resetLayer(currentLayerIdx);
            drawBoard();
        },
        draw: "/",
    });

    tools.push({
        name: "Pencil/Fill",
        color: "lightgray",
        click: function () {
            if (currentTool == "Pencil") {
                currentTool = "Fill";
            } else {
                currentTool = "Pencil";
            }
            drawBoard();
        },
        symbol: "⚫",
        draw: function () {
            if (currentTool == "Fill") {
                var offsets = [[1, 3], [4, -1], [9, 1], [9, 5], [7, 7], [3, 7], [5, 3]];
                drawToolShadow(this);
                for (var i = 0; i < offsets.length; i++) {
                    drawString("⚫", this.x + .5 + offsets[i][0], this.y + .5 + offsets[i][1], "black");
                }
            } else if (currentTool == "Pencil") {
                drawToolShadow(this);
                drawString(this.symbol, this.x + this.width / 2 - 2.5, this.y + 3.5, "black");
            } else {
                drawString(this.symbol, this.x + this.width / 2 - 2.5, this.y + 3.5, "gray");
            }
        }
    });
    //tools.push({
    //    name: "Fill",
    //    color: "lightgray",
    //    click: function () {
    //        currentTool = this.name;
    //        drawBoard();
    //    },
    //    draw: function () {
    //        if (currentTool == this.name) {
    //            drawToolShadow(this);
    //        }
    //        var offsets = [[1, 3], [4, -1], [9, 1], [9, 5], [7, 7], [3, 7], [5, 3]];
    //        for (var i = 0; i < offsets.length; i++) {
    //            drawString("⚫", this.x + .5 + offsets[i][0], this.y + .5 + offsets[i][1], "black");
    //        }
    //    }
    //});
    tools.push({
        name: function () { return "Show All Layers (currently " + (showAllLayers ? "ON)" : "OFF)") },
        color: "lightgray",
        click: function () {
            showAllLayers = !showAllLayers;
            drawBoard();
        },
        draw: function () {
            if (showAllLayers) {
                drawToolShadow(this);
            }
            drawString("@", this.x + this.width / 2 - 2.5, this.y + 3.5, "black");
        }
    });
    tools.push({
        name: function () { return "Draw on existing layer (currently " + (drawOnExistingLayer ? "ON)" : "OFF)") },
        color: "lightgray",
        click: function () {
            drawOnExistingLayer = !drawOnExistingLayer;
            drawBoard();
        },
        draw: function () {
            if (drawOnExistingLayer) {
                drawToolShadow(this);
            }
            drawString("*", this.x + this.width / 2 - 2.5, this.y + 3.5, "black");
        }
    });


    tools.push({
        name: "Select Layer",
        color: "lightgray",
        shortcutKey: "l",
        click: function () {
            selectLayerToolActive = !selectLayerToolActive;
            drawBoard();
        },
        draw: function () {
            if (selectLayerToolActive) {
                drawToolShadow(this);
            }
            drawString("#", this.x + this.width / 2 - 2.5, this.y + 3.5, "black");
        }
    });
    tools.push({
        name: "Merge Selection to this layer",
        color: "lightgray",
        shortcutKey: "m",
        click: function () {
            mergeLayerToolActive = !mergeLayerToolActive;
            drawBoard();
        },
        draw: function () {
            if (mergeLayerToolActive) {
                drawToolShadow(this);
            }
            drawString("+", this.x + this.width / 2 - 2.5, this.y + 3.5, "black");
        }
    });
    tools.push({
        name: "Break up current layer (Ctrl+click to solve multiple and pick best)",
        color: "lightgray",
        shortcutKey: "b",
        click: function (ctrlKey) {
            if (!ctrlKey) {
                breakUpLayer();
            } else {
                //solve and retry break-up a number of times, then show the best, based on either lowest number of unknowns in the board, or lowest number of unknowns in non-broken up layers.
                var bestBoardUnknownCnt = 10000;
                var bestBoardJSON;
                var bestBoardErrorMsg;
                var origBoardJSON = getBoardJSON();

                for (var i = 0; i < 20; i++) {

                    breakUpLayer();
                    determineLayerCells();
                    var unknownCnt = 0;
                    var boardJSON = getBoardJSON();

                    var errorMsg = solveBoard();
                    //count unknowns.
                    for (var layer of board) {
                        for (var col of layer) {
                            for (var cell of col) {
                                if (cell.hexTypeID > 2) {
                                    unknownCnt++;
                                }
                            }
                        }
                    }
                    if (unknownCnt < bestBoardUnknownCnt) {
                        bestBoardUnknownCnt = unknownCnt;
                        bestBoardJSON = boardJSON;
                        bestBoardErrorMsg = errorMsg;
                    }
                    registerBoardChange();
                    doBoardChange(origBoardJSON);
                    if (unknownCnt == 0) {
                        break;
                    }
                }

                doBoardChange(bestBoardJSON);
                if (bestBoardErrorMsg) {
                    alert(bestBoardErrorMsg);
                }
            }
            consolidateBoardLayersUp();
            drawBoard();
        },
        draw: "!!!!",
    });

    function toolClickSolve(ctrlKey) {
        if (ctrlKey) {
            determineLayerCells();
            var log = solveBoardWithGuesses();
            $("#log").val(log);
        } else {
            determineLayerCells();
            var errorMsg = solveBoard();
            if (errorMsg != "") {
                alert(errorMsg);
            }
        }
        drawBoard();

    }
    tools.push({
        name: "Solve (Ctrl+click to enable guessing)",
        color: "lightgray",
        shortcutKey: "s",
        click: function (ctrlKey) {
            toolClickSolve(ctrlKey);

            let layerShapes = "";
            //show the shapes used in this board.  For each layer, get the possible shapes.  If any cells in the layer have display value longer than 1, or are different, don't count them.
            for (let layerIdx = LAYERCNT - 1; layerIdx >= 0; layerIdx--) {
                let layerShapeSet = new Set();
                for (let cell of getBoardLayerCells(layerIdx)) {
                    if (boardDisplay[cell.x][cell.y]) {
                        layerShapeSet.add(boardDisplay[cell.x][cell.y]);
                    }
                }
                if (layerShapeSet.size == 1) {
                    let shape = Array.from(layerShapeSet)[0];
                    if (shape.length == 1) {
                        layerShapes += shape;
                    }
                }
            }

            if (layerShapes) {
                let layerShapesArr = layerShapes.split("");
                layerShapesArr.sort();
                $("#log").val("Shapes: " + layerShapes + ", or " + layerShapesArr.join(""));
            }

        },
        draw: "%}",
    });

    function toolClickUnSolve(ctrlKey) {
        registerBoardChange();
        for (var layerIdx = 0; layerIdx < LAYERCNT; layerIdx++) {
            for (var x = 0; x < COLS; ++x) {
                for (var y = 0; y < ROWS; ++y) {
                    if (board[layerIdx][x][y].hexTypeID > 0) {
                        setBoardHexType([x, y], layerIdx, layerIdx % 5 + 3);
                        if (ctrlKey) {
                            setBoardNumber([x, y], layerIdx, 0);
                        }
                    }
                }
            }
        }
        drawBoard();
    }

    tools.push({
        name: "Un-solve (Ctrl+Click to remove numbers as well",
        color: "lightgray",
        shortcutKey: "u",
        click: function (ctrlKey) {
            toolClickUnSolve(ctrlKey);
        },
        draw: "%(",
    });
    tools.push({
        name: "Move Layer Up (Ctrl+click to move to top, Shift+click to move all layers to top)",
        color: "lightgray",
        shortcutKey: "^up",
        click: function (ctrlKey, shiftKey) {
            if (shiftKey) {
                consolidateBoardLayersUp();
            }
            else if (currentLayerIdx < LAYERCNT - 1) {
                registerBoardChange();
                var currentLayer = board.splice(currentLayerIdx, 1);
                board.splice(currentLayerIdx + 1, 0, currentLayer[0]);
                //var currentLayer = JSON.stringify(board[currentLayerIdx]);
                //board[currentLayerIdx] = JSON.parse(JSON.stringify(board[newLayerIdx]));
                //board[newLayerIdx] = JSON.parse(currentLayer);
                setCurrentLayerIdx(currentLayerIdx + 1);
                if (ctrlKey) {
                    this.click(ctrlKey);
                }
            } else if (!ctrlKey) {
                alert("This layer is already on the top.")
            }
        },
        draw: "↥",
    });
    tools.push({
        name: "Move Layer Down (Ctrl+click to move to bottom, Shift+click to move all layers to bottom",
        color: "lightgray",
        shortcutKey: "^down",
        click: function (ctrlKey, shiftKey) {
            if (shiftKey) {
                consolidateBoardLayersDown()

            }
            else if (currentLayerIdx > 0) {
                registerBoardChange();
                var currentLayer = board.splice(currentLayerIdx, 1);
                board.splice(currentLayerIdx - 1, 0, currentLayer[0]);
                //var currentLayer = JSON.stringify(board[currentLayerIdx]);
                //board[currentLayerIdx] = JSON.parse(JSON.stringify(board[newLayerIdx]));
                //board[newLayerIdx] = JSON.parse(currentLayer);
                setCurrentLayerIdx(currentLayerIdx - 1);
                if (ctrlKey) {
                    this.click(ctrlKey);
                }
            } else if (!ctrlKey) {
                alert("This layer is already on the bottom.")
            }
        },
        draw: "↧",
    });
    tools.push({
        name: "Generate Filled Sudoku (Ctrl+click for solution count in console)",
        color: "lightgray",
        //shortcutKey: "^up",
        click: function (ctrlKey) {
            //populate all possibilities on the grid as display data.

            registerBoardChange();
            console.time("prep");

            var maxSudokuValue = prompt("Max Sudoku Value:");
            if (maxSudokuValue == "") return;
            maxSudokuValue = Number(maxSudokuValue);
            while (!Number.isInteger(maxSudokuValue)) {
                maxSudokuValue = prompt("Max Sudoku Value (Must be a number):");
                if (maxSudokuValue == "") return;
                maxSudokuValue = Number(maxSudokuValue);
            }
            var sudokuValueCounts = [];
            for (let k = 1; k <= maxSudokuValue; k++) {
                sudokuValueCounts[k] = 0;
            }

            var verifyCount = 0;
            var setCount = 0;
            var revertCount = 0;
            var maxSolutionBoards = 500;

            //var numberSeed = randomInt(maxSudokuValue) + 1;//random start to the range.  By setting this, we are now filling random grids.
            //todo: get random grids.  
            //todo maybe: use the solvesudoku to help before guessing.  Maybe when it matures to more than simple looking at axes.
            var solutionBoards = [];
            function sudokuSolver(flatBoard, cellList) {
                //for each cell, 
                //if cel; has no number
                //for each number 1-N, where N is the max value for that cell,
                //check if it's valid to set cell to X.  AKA check for other cells on the axes with value X.
                //if it's valid, set cell = X.
                //recurse: if it's good (aka all numbers in the grid have been populated with no conflicts), return true;
                //else, set value to 0, then go on to the next X.
                for (let i = 0, len = cellList.length; i < len; i++) {
                    var cell = cellList[i];
                    if (cell.hexTypeID > 0 && cell.number == 0) {
                        //var startNumber = numberSeed;
                        //numberSeed += j;
                        for (let k = 1; k <= maxSudokuValue; k++) {
                            let testNumber = k;//((startNumber + k) % maxSudokuValue) + 1;
                            verifyCount++;
                            if (verifySudoku(flatBoard, cell.x, cell.y, testNumber, maxSudokuValue) && sudokuValueCounts[k] < maxSudokuValue) {
                                setCellTestNumber(flatBoard, cell.x, cell.y, testNumber);
                                sudokuValueCounts[k]++;
                                setCount++;
                                if (sudokuSolver(flatBoard, cellList)) {
                                    return true;
                                } else {
                                    cell.number = 0;
                                    sudokuValueCounts[k]--;
                                    cell.potentialNumbers = null;

                                    //go through and reset the candidates for all seen cells
                                    for (let coordsListIdx = cell.sudokuCellGroups.length - 1; coordsListIdx >= 0; coordsListIdx--) {
                                        for (let coordsIdx = cell.sudokuCellGroups[coordsListIdx].cellCoords.length - 1; coordsIdx >= 0; coordsIdx--) {
                                            let coords = cell.sudokuCellGroups[coordsListIdx].cellCoords[coordsIdx];
                                            let seenCell = flatBoard[coords[0]][coords[1]];
                                            if (!seenCell.number) {
                                                seenCell.potentialNumbers = null;
                                            }
                                        }
                                    }

                                    revertCount++;
                                }
                            }
                        }
                        return false;
                    }
                }
                solutionBoards.push(getLayerCopy(flatBoard));
                if (!ctrlKey) {
                    return true;
                } else {
                    if (solutionBoards.length >= maxSolutionBoards) {
                        return true;
                    }
                }
                //if (solutionCount == 2)
            }

            setSudokuCellGroups();

            var flatBoard = getFlattenedBoard();
            let cellList = [];
            for (let i = 0; i < COLS; i++) {
                for (let j = 0; j < ROWS; j++) {
                    var cell = flatBoard[i][j];
                    if (cell.hexTypeID > 0) {
                        cellList.push(cell);
                        cell.potentialNumbers = null;
                    }
                    if (cell.number) {
                        sudokuValueCounts[cell.number]++;
                    }
                }
            }
            //shuffleArray(cellList);
            ///ensure existing thermometer constraints are obeyed in initial setup.
            for (let thermo of thermos) {
                for (let tidx = 0; tidx < thermo.length; tidx++) {
                    let cell = flatBoard[thermo[tidx][0]][thermo[tidx][1]];
                    if (cell.number) {
                        if (tidx > 0) {
                            let previousThermoCell = flatBoard[thermo[tidx - 1][0]][thermo[tidx - 1][1]];
                            if (previousThermoCell.number && previousThermoCell.number > cell.number) {
                                alert("Thermo breaks on value of " + cell.number + " at " + thermo[tidx]);
                                return;
                            }
                        }
                        let highestPotentialNumber = maxSudokuValue;
                        if (tidx < thermo.length - 1) {
                            let nextThermoCell = flatBoard[thermo[tidx + 1][0]][thermo[tidx + 1][1]];
                            if (nextThermoCell.number && nextThermoCell.number < cell.number) {
                                alert("Thermo breaks on value of " + cell.number + " at " + thermo[tidx]);
                                return;
                            }
                        }
                    }
                }
            }
            ///ensure existing cell group constraints are obeyed in initial setup.
            //function verifySudoku(flatBoard, checkHexCoordsX, checkHexCoordsY, checkNumber, maxNumber) {
            for (let cell of cellList) {
                if (cell.number) {
                    cell.potentialNumbers = null;
                    setSudokuPotentialNumbers(flatBoard, cell.x, cell.y, maxSudokuValue);
                    if (!cell.potentialNumbers[cell.number]) {
                        alert("Sudoku breaks on value of " + cell.number + " at " + cell.x + "," + cell.y + ".");
                        return;
                    }
                    cell.potentialNumbers = null;
                }
            }

            console.timeEnd("prep");
            console.time("solve");
            sudokuSolver(flatBoard, cellList);
            console.timeEnd("solve");
            console.time("update");

            if (solutionBoards.length && solutionBoards.length != maxSolutionBoards) {
                for (let i = 0; i < COLS; i++) {
                    for (let j = 0; j < ROWS; j++) {
                        var cell = getBoardCell([i, j]);
                        if (cell && !cell.number) {
                            //get the solution number, if all solution boards agree.
                            //todo maybe: display other possibilies on boardDisplay.
                            var possibleNumbers = new Set();
                            for (let solBoard of solutionBoards) {
                                possibleNumbers.add(solBoard[i][j].number);
                            }
                            if (possibleNumbers.size == 1) {
                                cell.number = Array.from(possibleNumbers)[0];
                            } else {
                                let displayVal = "";
                                for (let num of possibleNumbers) {

                                    displayVal += num.toString();
                                }
                                boardDisplay[i][j] = displayVal;
                                //                                cell.number = Array.from(possibleNumbers)[0];
                            }
                        }
                    }
                }
            }

            console.timeEnd("update")

            console.log("verifies:" + verifyCount);
            console.log("sets:" + setCount);
            console.log("reverts:" + revertCount);
            if (ctrlKey) {
                console.log(solutionBoards.length + (solutionBoards.length == maxSolutionBoards ? "+" : "") + " solution(s)");
            }

            console.log(sudokuValueCounts);

            drawBoard();
        },
        draw: ":I",
    });

    //tools.push({
    //    name: "Solve Sudoku",
    //    color: "lightgray",
    //    //shortcutKey: "^up",
    //    click: function () {
    //        //populate all possibilities on the grid as display data.

    //        registerBoardChange();

    //        var errMsg = solveSugurudoku();
    //        if (errMsg) {
    //            alert(errMsg);
    //        }

    //        drawBoard();
    //    },
    //    draw: ":)",
    //});
    tools.push({
        name: "Solve Suguru",
        color: "lightgray",
        //shortcutKey: "^up",
        click: function () {
            //populate all possibilities on the grid as display data.

            registerBoardChange();

            var errMsg = solveSuguru();
            if (errMsg) {
                alert(errMsg);
            }

            drawBoard();
        },
        draw: ":)",
    });
    function toolClickRecolor() {
        //recolor so that cells are 1 if they have at least 2 taller neighbors, else 5.
        for (let i = 0; i < COLS; i++) {
            for (let j = 0; j < ROWS; j++) {
                var cell = getBoardCell([i, j]);
                if (cell && cell.number) {
                    //get neighbors
                    let higherNeighborCnt = 0;
                    for (let ncoords of getAllNeighborHexCoords([i, j])) {
                        let c2 = getBoardCell(ncoords);
                        if (c2 && c2.hexTypeID > 0) {
                            if (c2.number && c2.number > cell.number) {
                                higherNeighborCnt++;
                            } else if (c2.hexTypeID == 3) {
                                higherNeighborCnt++;
                            }
                        }
                    }
                    if (higherNeighborCnt >= 2) {
                        setBoardHexType([i, j], - 1, 6);
                    } else {
                        setBoardHexType([i, j], - 1, 7);
                    }
                }
            }

        }
        let observervalues = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        //recolor so that cells are 2 if they have at least cell.value neighbors which are 1.
        for (let i = 0; i < COLS; i++) {
            for (let j = 0; j < ROWS; j++) {
                var cell = getBoardCell([i, j]);
                if (cell && cell.number) {
                    //get neighbors
                    let passableNeighborCnt = 0;
                    for (let ncoords of getAllNeighborHexCoords([i, j])) {
                        let c2 = getBoardCell(ncoords);
                        if (c2 && c2.hexTypeID > 0) {
                            if (c2.hexTypeID == 5 || c2.hexTypeID == 6 || c2.hexTypeID == 3) {
                                passableNeighborCnt++;
                            }
                        }
                    }
                    if (passableNeighborCnt >= cell.number) {
                        if (cell.hexTypeID == 7) {
                            setBoardHexType([i, j], - 1, 2);
                        } else {
                            setBoardHexType([i, j], - 1, 5);
                        }
                        observervalues[cell.number]++;
                    }
                }
            }
        }
        console.log(observervalues);
    }
    tools.push({
        name: "Swap Numbers (Ctrl+click to do random swaps 10 times, shift+click to clear before and solve after)",
        color: "lightgray",
        //shortcutKey: "^up",
        click: function (ctrlKey, shiftKey) {
            var solveCnt = 0;
            var solveErrorMsg = "";
            let highestNumber = 0;
            for (let i = 0; i < COLS; i++) {
                for (let j = 0; j < ROWS; j++) {
                    var cell = getBoardCell([i, j]);
                    if (cell && cell.number && cell.number > highestNumber) {
                        highestNumber = cell.number;
                    }
                }
            }

            while (solveCnt < 30) {

                registerBoardChange();
                if (shiftKey) {
                    determineLayerCells();
                    toolClickUnSolve();
                }
                let numTimes = 1;
                if (ctrlKey) {
                    numTimes = 10;
                }
                for (let cnt = 0; cnt < numTimes; cnt++) {
                    let swapdict = [];
                    if (ctrlKey) {
                        let n1 = randomInt(highestNumber) + 1;
                        let n2 = randomInt(highestNumber) + 1;
                        swapdict[n1] = n2;
                        swapdict[n2] = n1;
                    } else {
                        let n1 = prompt("number 1");
                        let n2 = prompt("number 2");
                        if (n1 && n2) {
                            if (n1.length < 3 && n2.length < 3) {
                                n1 = Number(n1);
                                n2 = Number(n2);
                                swapdict[n1] = n2;
                                swapdict[n2] = n1;
                            } else {
                                for (let ni = 0; ni < n1.length; ni++) {
                                    swapdict[Number(n1[ni])] = Number(n2[ni]);
                                    //swapdict[Number(n2[ni])] = Number(n1[ni]);
                                }
                            }

                        }
                    }
                    for (let i = 0; i < COLS; i++) {
                        for (let j = 0; j < ROWS; j++) {
                            var cell = getBoardCell([i, j]);
                            if (cell && cell.number && swapdict[cell.number]) {
                                cell.number = swapdict[cell.number];
                            }
                        }
                    }
                }
                if (shiftKey) {
                    solveErrorMsg = solveBoard();
                    if (solveErrorMsg != "") {
                        console.log(solveErrorMsg);
                    } else {
                        break;
                    }
                    solveCnt++;
                } else {
                    break;
                }
            }
            toolClickRecolor();

            drawBoard();
            if (solveErrorMsg != "") {
                alert(solveErrorMsg);
            }
        },
        draw: "<>",
    });
    tools.push({
        name: "Color odd/even",
        color: "lightgray",
        //shortcutKey: "^up",
        click: function () {
            registerBoardChange();
            toolClickRecolor();


            //for (let i = 0; i < COLS; i++) {
            //    for (let j = 0; j < ROWS; j++) {
            //        var cell = getBoardCell([i, j]);
            //        if (cell && cell.number) {
            //            setBoardHexType([i, j], -1, 5 + cell.number % 2);
            //        }
            //    }
            //}
            drawBoard();
        },
        draw: "o",
    });
    tools.push({
        name: "Solve Starbattle",
        color: "lightgray",
        shortcutKey: "w",
        click: function (ctrlKey, shiftKey) {
            //populate all possibilities on the grid as display data.

            if (event.key == 'w') shiftKey = true;

            registerBoardChange();
            console.time("prep");

            var starCount = prompt("# of stars per line/region");
            if (starCount == "") return;
            starCount = Number(starCount);
            while (!Number.isInteger(starCount)) {
                starCount = prompt("# of stars per line/region (Must be a number):");
                if (starCount == "") return;
                starCount = Number(starCount);
            }

            //let starCount = 2;

            let verifyCount = 0;
            let setCount = 0;
            let revertCount = 0;
            let finalCheckCount = 0;
            let solBoardCount = 0;
            let maxSolutionBoards = 50;

            let finalCheckGroups = [];

            var solutionBoards = [];
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
                    if (cell.hexTypeID > 0 && cell.number == 0) {
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
                            cell.number = 2;

                            setCount++;
                            if (starBattleSolver(flatBoard, cellList, i + 1)) {
                                return true;
                            } else {
                                cell.number = 0;

                                revertCount++;
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

                //todo: better final check, showing that every line in each direction and every group (layer below the first) do have exactly starCount stars.
                //do final check that every star sees exactly N - 1 other stars.Surely there's a better way to do this, but oh well.
                finalCheckCount++;
                for (let group of finalCheckGroups) {
                    let hasCells = false;
                    let colStarCount = 0;
                    for (let cell of group) {
                        //if there are any cells, there must be starCount stars.
                        if (cell.hexTypeID > 0) {
                            hasCells = true;
                            if (cell.number == 2) {
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

            setStarBattleCellGroups(starCount);

            var flatBoard = getFlattenedBoard();
            let cellList = [];
            for (let i = 0; i < COLS; i++) {
                let colGroup = [];
                for (let j = 0; j < ROWS; j++) {
                    let cell = flatBoard[i][j];
                    if (cell.hexTypeID > 0) {
                        cellList.push(cell);
                        colGroup.push(cell);
                    }
                }
                if (colGroup.length) {
                    finalCheckGroups.push(colGroup);
                }
            }
            //northwest to southeast, part 1.
            for (let i = 1; i < COLS; i++) {
                let colGroup = [];
                let coords = [i, 0];
                while (inBoard(coords[0], coords[1])) {
                    let cell = flatBoard[coords[0]][coords[1]];
                    if (cell.hexTypeID > 0) {
                        colGroup.push(cell);
                    }
                    coords = getNeighborHexCoords(coords, 0);
                }
                if (colGroup.length) {
                    finalCheckGroups.push(colGroup);
                }
            }
            //northwest to southeast, part 2.
            for (let i = 1; i < ROWS; i++) {
                let colGroup = [];
                let coords = [0, i];
                while (inBoard(coords[0], coords[1])) {
                    let cell = flatBoard[coords[0]][coords[1]];
                    if (cell.hexTypeID > 0) {
                        colGroup.push(cell);
                    }
                    coords = getNeighborHexCoords(coords, 0);
                }
                if (colGroup.length) {
                    finalCheckGroups.push(colGroup);
                }
            }
            //southwest to northeast, part 1.
            for (let i = 1; i < COLS; i++) {
                let colGroup = [];
                let coords = [i, ROWS - 1];
                while (inBoard(coords[0], coords[1])) {
                    let cell = flatBoard[coords[0]][coords[1]];
                    if (cell.hexTypeID > 0) {
                        colGroup.push(cell);
                    }
                    coords = getNeighborHexCoords(coords, 1);
                }
                if (colGroup.length) {
                    finalCheckGroups.push(colGroup);
                }
            }
            //southwest to northeast, part 2.
            for (let i = 1; i < ROWS; i++) {
                let colGroup = [];
                let coords = [0, i];
                while (inBoard(coords[0], coords[1])) {
                    let cell = flatBoard[coords[0]][coords[1]];
                    if (cell.hexTypeID > 0) {
                        colGroup.push(cell);
                    }
                    coords = getNeighborHexCoords(coords, 1);
                }
                if (colGroup.length) {
                    finalCheckGroups.push(colGroup);
                }
            }
            //prep layer groups for final check.
            let passedFirstLayer = false;
            for (let iLayer = LAYERCNT - 1; iLayer >= 0; iLayer--) {
                let layerCells = [];
                for (let x = 0; x < COLS; ++x) {
                    for (let y = 0; y < ROWS; ++y) {
                        let cell = board[iLayer][x][y];
                        if (cell.hexTypeID > 0) {
                            if (!passedFirstLayer) {
                                passedFirstLayer = true;
                                x = COLS - 1;
                                break;
                            } else {
                                layerCells.push(flatBoard[x][y]);
                            }
                        }
                    }
                }
                if (layerCells.length) {
                    finalCheckGroups.push(layerCells);
                }
            }
            //todo: check northeast/southwest and northwest/southeast lines.
            //todo: make cell check groups based on current layer, not underlying layer.  Want to be able to have just one level deep on any given cell, to easily solve SLICY and starbattle together.

            //naively turn off cells that are already fulfilled.
            for (let group of finalCheckGroups) {
                let colStarCount = 0;
                for (let cell of group) {
                    //if there are any cells, there must be starCount stars.
                    if (cell.hexTypeID > 0) {
                        if (cell.number == 2) {
                            colStarCount++;
                            let c = getBoardCell([cell.x, cell.y]);
                            c.hexTypeID = 2;
                            for (let ncoords of getAllNeighborHexCoords([cell.x, cell.y])) {
                                let c2 = getBoardCell(ncoords);
                                if (c2 && c2.hexTypeID > 0) {
                                    c2.number = 1;
                                    c2.hexTypeID = 1;
                                }
                            }
                        }
                    }
                }
                if (colStarCount == starCount) {
                    for (let cell of group) {
                        //if there are any cells, there must be starCount stars.
                        if (cell.hexTypeID > 0 && !cell.number) {
                            registerBoardChange();
                            let c = getBoardCell([cell.x, cell.y]);
                            c.number = 1;
                            c.hexTypeID = 1;
                        }
                    }
                }
            }

            if (!shiftKey) {

                //shuffleArray(cellList);

                console.timeEnd("prep");
                console.time("solve");
                starBattleSolver(flatBoard, cellList);
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
                            if (cell && !cell.number) {
                                //get the solution number, if all solution boards agree.
                                //todo maybe: display other possibilies on boardDisplay.
                                var possibleNumbers = new Set();
                                for (let solBoard of unpackedSolutionBoards) {
                                    possibleNumbers.add(solBoard[i][j].number);
                                }
                                if (possibleNumbers.size == 1) {
                                    cell.number = Array.from(possibleNumbers)[0];
                                    if (cell.number == 0) {
                                        boardDisplay[i][j] = " -";
                                    }
                                } else {
                                    boardDisplay[i][j] = "";
                                }
                                if (cell.number == 1) {
                                    //cell.number = 0;
                                }
                            }
                        }
                    }
                    for (let i = 0; i < COLS; i++) {
                        for (let j = 0; j < ROWS; j++) {
                            var cell = getBoardCell([i, j]);
                            if (cell && cell.number == 2) {
                                cell.hexTypeID = 1;//set to OFF for SLICY
                            }
                        }
                    }
                }

                console.timeEnd("update");

                console.log("verifies:" + verifyCount);
                console.log("sets:" + setCount);
                console.log("reverts:" + revertCount);
                console.log("final checks:" + finalCheckCount);
                console.log("solution board count:" + solBoardCount);

                if (ctrlKey) {
                    console.log(solutionBoards.length + (solutionBoards.length == maxSolutionBoards ? "+" : "") + " solution(s)");
                }
            }

            drawBoard();
        },
        draw: "☆",
    });

    tools.push({
        name: "Thermo",
        color: "lightgray",
        click: function () {
            currentTool = this.name;
            drawBoard();
        },
        draw: function () {
            if (currentTool == this.name) {
                drawToolShadow(this);
            }
            drawString("T", this.x + 4.5, this.y + 3.5, "black");
        }
    });

    tools.push({
        name: "Flip Horizontally (Ctrl+click for Vertically).  This will reset the Undo/Redo.",
        color: "lightgray",
        //shortcutKey: "^up",
        click: function (ctrlKey) {
            for (let iLayer = 0; iLayer < LAYERCNT; iLayer++) {
                let layerCopy = getLayerCopy(board[iLayer]);
                for (let colIdx = 0; colIdx < COLS; colIdx++) {
                    for (let rowIdx = 0; rowIdx < ROWS; rowIdx++) {
                        if (ctrlKey) {
                            if (colIdx % 2 == 0) {
                                if (inBoard(colIdx, ROWS - rowIdx)) {
                                    board[iLayer][colIdx][rowIdx] = layerCopy[colIdx][ROWS - rowIdx];
                                }
                            } else {
                                if (inBoard(colIdx, ROWS - 1 - rowIdx)) {

                                    board[iLayer][colIdx][rowIdx] = layerCopy[colIdx][ROWS - 1 - rowIdx];
                                }
                            }
                        } else {
                            board[iLayer][colIdx][rowIdx] = layerCopy[COLS - 1 - colIdx][rowIdx];
                        }
                    }
                }
            }
            drawBoard();
            importBoard();
        },
        draw: "><",
    });

    //tools.push({
    //    name: "Placeholder",
    //    color: "lightgray",
    //    //shortcutKey: "^up",
    //    click: function () {
    //    },
    //    draw: "?",
    //});



    //layout tools in columnar grid.
    for (var i = 0; i < tools.length; i++) {
        var tool = tools[i];
        tool.x = toolBoxLeft + (toolWidth + toolMargin) * (i % toolColumns);
        tool.y = toolMargin - .5 + (toolHeight + toolMargin) * (Math.floor(i / toolColumns));
        tool.height = toolHeight;
        tool.width = toolWidth;
    }

    var topToolX = tools[0].x;
    var bottomToolY = tools[tools.length - 1].y + toolHeight + toolMargin;
    var nudgeToolOffsets = [[12, 0], [0, 6], [0, 19], [12, 26], [24, 19], [24, 6], [12, 13]];

    tools.push({
        name: function () { return "Nudge All Layers (currently " + (nudgeAllLayers ? "ON)" : "OFF)") },
        color: "",
        click: function () {
            nudgeAllLayers = !nudgeAllLayers;
            drawBoard();
        },
        draw: function () {
            ctx.strokeStyle = "black";
            ctx.fillStyle = "lightgray";
            if (nudgeAllLayers) {
                ctx.lineWidth = 1.5;
                ctx.shadowBlur = 3;
            }
            setPathCoords(this.x - 1, this.y, this.height / HEX_H);
            ctx.fill();
            ctx.stroke();
            ctx.lineWidth = 1;
            ctx.shadowBlur = 0;
            drawString("=", this.x + this.width / 2 - 2, this.y + 2.5, "black");
        },
        x: topToolX + .5 + nudgeToolOffsets[6][0],
        y: bottomToolY + nudgeToolOffsets[6][1],
        width: 12,
        height: 13,
    });
    for (var i = 0; i < 6; i++) {
        var dir = (i + 2) % 6;
        tools.push({
            name: "Nudge Layer " + HexDirections[dir].name,
            color: "",
            click: function () {
                nudgeLayer(this.dir);
            },
            symbol: HexDirections[dir].symbol,
            draw: function () {
                ctx.strokeStyle = "black";
                ctx.fillStyle = "lightgray";
                setPathCoords(this.x - 1, this.y, this.height / HEX_H);
                ctx.fill();
                ctx.stroke();
                var yOffset = HexDirections[this.dir].name.startsWith("NORTH") ? 2.5 : 1.5;
                drawString(this.symbol, this.x + this.width / 2 - 3, this.y + yOffset, "black");
            },
            dir: dir,
            x: topToolX + .5 + nudgeToolOffsets[i][0],
            y: bottomToolY + nudgeToolOffsets[i][1],
            width: 12,
            height: 13,
        });
    }

    bottomToolY += 26 + toolHeight;

    var descriptionTool = {
        name: "Description",
        color: "#DDDDDD",
        click: function () {
            var d = "~";
            var promptText = "Description";
            while (d.indexOf("~") > -1) {
                d = prompt(promptText, description);
                if (d == null) { return; }
                promptText = "Description (cannot contain '~'):";
            }
            registerBoardChange();
            description = d;
            drawBoard();
        },
        draw: function () {
            drawString(description, this.x + 1.5, this.y + 1.5, "black", null, this.width);
        },
        x: tools[0].x - toolMargin - (40 * 8 + 2),
        y: toolMargin - .5,
        height: bottomToolY - toolMargin + .5,
        width: (40 * 8 + 2),
    }
    tools.push(descriptionTool);

    //add each layer as a tool, which selects that layer.
    for (var i = 0; i < LAYERCNT; i++) {
        tools.push({
            name: "Select Layer " + (i + 1).toString(),
            color: "",
            click: function () {
                setCurrentLayerIdx(this.layerIdx);
            },
            draw: function () {
                //get hex types from the current layer.
                var types = [];
                for (var x = 0; x < board[this.layerIdx].length; ++x) {
                    for (var y = 0; y < board[this.layerIdx][x].length; ++y) {
                        var hexTypeID = board[this.layerIdx][x][y].hexTypeID;
                        if (hexTypeID != 0) {
                            types.push(hexTypeID);
                        }
                    }
                }
                types.sort(function (a, b) { return a - b });
                while (types.length > 115) {
                    types.length = 115;
                }
                this.width = types.length * 3 + 19;
                this.x = canvasW - .5 - toolMargin - this.width;
                for (var iCol = 0; iCol < types.length; iCol++) {
                    var currentType = types[iCol];
                    var initialX = this.x + 3 * (iCol) + .5;
                    var currentWidth = 1;
                    while (iCol + 1 < types.length && types[iCol + 1] == currentType) {
                        iCol++;
                        currentWidth++;
                    }
                    ctx.fillStyle = hexTypes[currentType].color;
                    ctx.fillRect(initialX, this.y, currentWidth * 3, 10.5);
                    addMouseOverText(hexTypes[currentType].name + ": " + currentWidth.toString(), "warning", initialX, this.y, initialX + currentWidth * 3, this.y + 10.5);
                }



                //jump to the last element of this type.
                /*
                    var currentType = types[iCol];
                    while (types[iCol] == currentType && iCol != types.length - 1){
                    iCol++
                    currentWidth++;
                    }
     
                */
                if (types.length > 0) {
                    ctx.strokeRect(this.x, this.y, this.width - 18, this.height);
                }
                var textColor = "black";
                ctx.fillStyle = "black";
                if (layerWarnings[this.layerIdx]) {
                    ctx.strokeStyle = "red";
                    ctx.strokeRect(this.x + this.width, this.y, -16, 10);
                    ctx.fillStyle = "red";
                    ctx.fillRect(this.x + this.width, this.y, -16, 10);
                    addMouseOverText(layerWarnings[this.layerIdx], "warning", this.x, this.y, this.x + this.width, this.y + this.height);
                    ctx.strokeStyle = "black";
                    textColor = "white";
                }
                if (this.layerIdx == currentLayerIdx) {
                    ctx.strokeRect(this.x + this.width, this.y, -16, 10);
                    ctx.fillRect(this.x + this.width, this.y, -16, 10);
                    textColor = "white";
                }

                //render layer number
                var layerName = this.layerIdx < 9 ? "0" + (this.layerIdx + 1).toString() : (this.layerIdx + 1).toString();
                drawString(layerName, this.x + this.width - 16 + .5, this.y + .5, textColor);
            },
            x: canvasW - .5 - toolMargin - 16,
            y: bottomToolY + toolMargin + 10 * (LAYERCNT - 1 - i),
            height: 10,
            width: 16,
            layerIdx: i,
        });
    }
    for (var i = 0; i < tools.length; i++) {
        var tool = tools[i];
        addMouseOverText(tool.name, "tool", tool.x, tool.y, tool.x + tool.width, tool.y + tool.height);
    }


    var boardDef = window.localStorage.getItem("boardDef");
    if (boardDef) {
        $("#txtBoardDefinition").val(boardDef);
        importBoard();
    } else {
        resetBoard();
    }

    //used to draw goals: ctx.setLineDash([linelen / 3]);
    $('#btnImport').click(importBoard);
    $("#inputActiveLayer").bind('keyup mouseup', function () {
        currentLayerIdx = $("#inputActiveLayer").val() - 1;
        drawBoard();
    });
});

//Fix solving speed - gone from chameleons = 5 seconds to 40.  Probably make it all based on a flat board with just the hex type values, rather than the real board.