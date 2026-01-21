/*
* Fit Text to Frame - Versión Limpia
* Ajusta automáticamente el texto para que quepa en marcos de texto de InDesign
*/

function main() {
    // Verificar que hay un documento abierto
    if (app.documents.length == 0) { 
        alert("Por favor abre un documento e intenta de nuevo.", "Fit Text to Frame");
        return;
    }
    
    // Mostrar interfaz de usuario
    if (showUI() == 2) { 
        return;
    }
    
    try {
        // Guardar configuraciones originales
        var oldRedrawVal = app.scriptPreferences.enableRedraw;
        app.scriptPreferences.enableRedraw = false;
        var oldWhenScalingVal = app.transformPreferences.whenScaling;
        app.transformPreferences.whenScaling = WhenScalingOptions.ADJUST_SCALING_PERCENTAGE;
        
        var document = app.activeDocument;
        var mfs; // marcos de texto a procesar
        
        // Determinar qué marcos procesar según la configuración
        if (document.extractLabel("FitTextScope") == "selectionCurrent") { 
            mfs = app.selection;
            if (mfs.length == 0) { 
                alert("No hay nada seleccionado.", "Fit Text to Frame");
                return;
            }
            if (mfs[0].hasOwnProperty("baseline")) { 
                mfs = [app.selection[0].parentTextFrames[0]];
            }
        }
        
        if (document.extractLabel("FitTextScope") == "selectionDoc") { 
            mfs = findFrames(true);
            if (mfs == undefined) { 
                alert("No se encontraron marcos de texto.", "Fit Text to Frame");
                return;
            }
        }
        
        if (document.extractLabel("FitTextScope") == "selectionObjectStyle") { 
            mfs = findFramesByObjectStyle();
            if (mfs.length == 0) { 
                alert("No se encontraron marcos de texto con el estilo de objeto seleccionado.", "Fit Text to Frame");
                return;
            }
        }
        
        if (document.extractLabel("FitTextScope") == "selectionParagraphStyle") { 
            mfs = findFramesByParagraphStyle();
            if (mfs.length == 0) { 
                alert("No se encontraron marcos de texto con el estilo de párrafo seleccionado.", "Fit Text to Frame");
                return;
            }
        }
        
        if (document.extractLabel("FitTextScope") == "selectionCharacterStyle") { 
            mfs = findFramesByCharacterStyle();
            if (mfs.length == 0) { 
                alert("No se encontraron marcos de texto con el estilo de carácter seleccionado.", "Fit Text to Frame");
                return;
            }
        }
        
        var progressLength = 0;
        var widthOnly = false;
        var transformations = [];
        
        if (document.extractLabel("FitTextWidthOnly") === "true") { 
            widthOnly = true;
        }
        
        // Agrupar marcos por historia (story)
        var myStories = [];
        for (var i = 0; i < mfs.length; i += 1) { 
            var myParentStory = mfs[i].parentStory;
            var storyID = "ID" + myParentStory.id;
            if (myStories[storyID] == undefined) { 
                myStories[storyID] = myParentStory;
            }
        }
        
        // Constantes para coordenadas
        var IC = CoordinateSpaces.INNER_COORDINATES;
        var TL = AnchorPoint.TOP_LEFT_ANCHOR;
        var BR = AnchorPoint.BOTTOM_RIGHT_ANCHOR;
        var BB = BoundingBoxLimits.GEOMETRIC_PATH_BOUNDS;
        
        // Contar historias para barra de progreso
        for (var myStoryID in myStories) { 
            progressLength++;
        }
        
        // Crear barra de progreso si hay muchos elementos
        var progress = {};
        progress.window = new Window("window", "Fit Text to Frame");
        progress.bar = progress.window.add("progressbar", [12, 24, 450, 36], 0, progressLength);
        if (progressLength > 10) { 
            progress.window.show();
        }
        
        progressLength = 0;
        
        // Procesar cada historia
        for (var myStoryID in myStories) { 
            progress.bar.value = ++progressLength;
            progress.window.update();
            
            var oldBR = [];
            var originalTL = [];
            var newBR = [];
            var tS = []; // stroke weights
            var tI = []; // insets
            var tG = []; // gutters
            var cO = []; // corner options
            
            var myStory = myStories[myStoryID];
            mfs = myStory.textContainers;
            
            // Guardar transformaciones originales
            for (var i = 0; i < mfs.length; i += 1) { 
                transformations.push({
                    frame: mfs[i], 
                    rotation: mfs[i].rotationAngle, 
                    shear: mfs[i].shearAngle
                });
                mfs[i].rotationAngle = mfs[i].shearAngle = 0;
            }
            
            // Procesar texto que se desborda (reducir)
            if ((myStory.overflows) && (document.extractLabel("FitTextMode") != "enlarge")) { 
                processOverflowingText(mfs, myStory, widthOnly, oldBR, originalTL, newBR, tS, tI, tG, cO, IC, TL, BR, BB);
            }
            
            // Procesar texto que no se desborda (ampliar)
            if ((!myStory.overflows) && (document.extractLabel("FitTextMode") != "reduce")) { 
                if (myStory.contents != "") { 
                    processNonOverflowingText(mfs, myStory, widthOnly, oldBR, originalTL, newBR, tS, tI, tG, cO, IC, TL, BR, BB);
                }
            }
        }
        
        // Restaurar transformaciones originales
        for (var i = 0; i < transformations.length; i += 1) { 
            transformations[i].frame.rotationAngle = transformations[i].rotation;
            transformations[i].frame.shearAngle = transformations[i].shear;
        }
        
        progress.window.close();
        
    } catch (e) {
        alert("Lo siento, ha ocurrido un error: " + e.message);
    } finally {
        // Restaurar configuraciones
        app.scriptPreferences.enableRedraw = oldRedrawVal;
        app.transformPreferences.whenScaling = oldWhenScalingVal;
    }
}

function processOverflowingText(mfs, myStory, widthOnly, oldBR, originalTL, newBR, tS, tI, tG, cO, IC, TL, BR, BB) {
    var s = 2; // factor de escala inicial
    
    // Guardar propiedades originales
    for (var i = 0; i < mfs.length; i += 1) { 
        var hScale = mfs[i].horizontalScale / 100;
        var vScale = mfs[i].verticalScale / 100;
        oldBR[i] = mfs[i].resolve([BR, BB], IC)[0];
        originalTL[i] = mfs[i].resolve([TL, BB], IC)[0];
        
        tS[i] = mfs[i].strokeWeight * hScale;
        if (mfs[i].strokeColor == app.activeDocument.swatches[0]) { 
            tS[i] = 0;
        }
        
        tI[i] = mfs[i].textFramePreferences.insetSpacing;
        if (tI[i] instanceof Array) { 
            tI[i][0] *= vScale;
            tI[i][1] *= hScale;
            tI[i][2] *= vScale;
            tI[i][3] *= hScale;
        } else {
            tI[i] *= hScale;
        }
        
        tG[i] = mfs[i].textFramePreferences.textColumnGutter * hScale;
        cO[i] = {
            bl: mfs[i].bottomLeftCornerRadius * hScale, 
            br: mfs[i].bottomRightCornerRadius * hScale, 
            tl: mfs[i].topLeftCornerRadius * hScale, 
            tr: mfs[i].topRightCornerRadius * hScale
        };
    }
    
    // Búsqueda binaria para encontrar el factor de escala óptimo
    while (true) {
        var smx;
        if (!widthOnly) { 
            smx = app.transformationMatrices.add({horizontalScaleFactor: 1 / s, verticalScaleFactor: 1 / s});
        } else {
            smx = app.transformationMatrices.add({horizontalScaleFactor: 1 / s, verticalScaleFactor: 1});
        }
        
        // Aplicar transformación a cada marco
        for (var i = 0; i < mfs.length; i += 1) { 
            var hScale = (mfs[i].horizontalScale / 100) * s;
            var vScale = (mfs[i].verticalScale / 100) * s;
            var bottomRight = mfs[i].resolve([BR, BB], IC)[0];
            
            if (!(mfs[i] instanceof TextFrame)) { 
                continue;
            }
            
            var myX = Math.abs(bottomRight[0] - originalTL[i][0]);
            var myY = Math.abs(bottomRight[1] - originalTL[i][1]);
            
            if (!widthOnly) { 
                myX *= s;
                myY *= s;
            } else {
                myX *= s;
            }
            
            // Ajustar propiedades del marco
            if (tS[i] != 0) { 
                mfs[i].strokeWeight = tS[i] / hScale;
            }
            applyInset(mfs[i], tI[i], hScale, vScale);
            mfs[i].textFramePreferences.textColumnGutter = tG[i] / hScale;
            mfs[i].topLeftCornerRadius = cO[i].tl / hScale;
            mfs[i].topRightCornerRadius = cO[i].tr / hScale;
            mfs[i].bottomLeftCornerRadius = cO[i].bl / hScale;
            mfs[i].bottomRightCornerRadius = cO[i].br / hScale;
            
            newBR[i] = [originalTL[i][0] + myX, originalTL[i][1] + myY];
            mfs[i].reframe([IC, BB], [originalTL[i], newBR[i]]);
            mfs[i].transform(CoordinateSpaces.pasteboardCoordinates, [AnchorPoint.topLeftAnchor, BB], smx);
        }
        
        if (myStory.overflows) { 
            for (var i = 0; i < mfs.length; i += 1) { 
                oldBR[i] = newBR[i];
            }
            continue;
        } else {
            s -= ((s - 1) / 2);
            if ((1 - s) > -0.0001) { 
                break;
            }
            // Revertir cambios para la siguiente iteración
            for (var i = 0; i < mfs.length; i += 1) { 
                var hScale = (mfs[i].horizontalScale / 100) * s;
                var vScale = (mfs[i].verticalScale / 100) * s;
                
                if (tS[i] != 0) { 
                    mfs[i].strokeWeight = tS[i] / hScale;
                }
                applyInset(mfs[i], tI[i], hScale, vScale);
                mfs[i].textFramePreferences.textColumnGutter = tG[i] / hScale;
                mfs[i].topLeftCornerRadius = cO[i].tl / hScale;
                mfs[i].topRightCornerRadius = cO[i].tr / hScale;
                mfs[i].bottomLeftCornerRadius = cO[i].bl / hScale;
                mfs[i].bottomRightCornerRadius = cO[i].br / hScale;
                mfs[i].transform(CoordinateSpaces.pasteboardCoordinates, [AnchorPoint.topLeftAnchor, BB], smx.invertMatrix());
                mfs[i].reframe([IC, BB], [originalTL[i], oldBR[i]]);
            }
        }
    }
}

function processNonOverflowingText(mfs, myStory, widthOnly, oldBR, originalTL, newBR, tS, tI, tG, cO, IC, TL, BR, BB) {
    var s = 0.5; // factor de escala inicial para ampliar
    
    // Guardar propiedades originales
    for (var i = 0; i < mfs.length; i += 1) { 
        var hScale = mfs[i].horizontalScale / 100;
        var vScale = mfs[i].verticalScale / 100;
        oldBR[i] = mfs[i].resolve([BR, BB], IC)[0];
        originalTL[i] = mfs[i].resolve([TL, BB], IC)[0];
        
        tS[i] = mfs[i].strokeWeight * hScale;
        if (mfs[i].strokeColor == app.activeDocument.swatches[0]) { 
            tS[i] = 0;
        }
        
        tI[i] = mfs[i].textFramePreferences.insetSpacing;
        if (tI[i] instanceof Array) { 
            tI[i][0] *= vScale;
            tI[i][1] *= hScale;
            tI[i][2] *= vScale;
            tI[i][3] *= hScale;
        } else {
            tI[i] *= (mfs[i].horizontalScale / 100);
        }
        
        tG[i] = mfs[i].textFramePreferences.textColumnGutter * hScale;
        cO[i] = {
            bl: mfs[i].bottomLeftCornerRadius * hScale, 
            br: mfs[i].bottomRightCornerRadius * hScale, 
            tl: mfs[i].topLeftCornerRadius * hScale, 
            tr: mfs[i].topRightCornerRadius * hScale
        };
    }
    
    // Búsqueda binaria para ampliar texto
    while ((1 - s) > 0.0001) {
        var smx;
        if (!widthOnly) { 
            smx = app.transformationMatrices.add({horizontalScaleFactor: 1 / s, verticalScaleFactor: 1 / s});
        } else {
            smx = app.transformationMatrices.add({horizontalScaleFactor: 1 / s, verticalScaleFactor: 1});
        }
        
        // Aplicar transformación a cada marco
        for (var i = 0; i < mfs.length; i += 1) { 
            var hScale = (mfs[i].horizontalScale / 100) * s;
            var vScale = (mfs[i].verticalScale / 100) * s;
            var bottomRight = mfs[i].resolve([BR, BB], IC)[0];
            
            if (!(mfs[i] instanceof TextFrame)) { 
                continue;
            }
            
            var myX = Math.abs(bottomRight[0] - originalTL[i][0]);
            var myY = Math.abs(bottomRight[1] - originalTL[i][1]);
            
            if (!widthOnly) { 
                myX *= s;
                myY *= s;
            } else {
                myX *= s;
            }
            
            // Ajustar propiedades del marco
            if (tS[i] != 0) { 
                mfs[i].strokeWeight = tS[i] / hScale;
            }
            applyInset(mfs[i], tI[i], hScale, vScale);
            mfs[i].textFramePreferences.textColumnGutter = tG[i] / hScale;
            mfs[i].topLeftCornerRadius = cO[i].tl / hScale;
            mfs[i].topRightCornerRadius = cO[i].tr / hScale;
            mfs[i].bottomLeftCornerRadius = cO[i].bl / hScale;
            mfs[i].bottomRightCornerRadius = cO[i].br / hScale;
            
            newBR[i] = [originalTL[i][0] + myX, originalTL[i][1] + myY];
            mfs[i].reframe([IC, BB], [originalTL[i], newBR[i]]);
            mfs[i].transform(CoordinateSpaces.pasteboardCoordinates, [AnchorPoint.topLeftAnchor, BB], smx);
        }
        
        if (!myStory.overflows) { 
            for (var i = 0; i < mfs.length; i += 1) { 
                oldBR[i] = newBR[i];
            }
            continue;
        } else {
            s += ((1 - s) / 2);
            // Revertir cambios para la siguiente iteración
            for (var i = 0; i < mfs.length; i += 1) { 
                var hScale = (mfs[i].horizontalScale / 100) * s;
                var vScale = (mfs[i].verticalScale / 100) * s;
                
                if (tS[i] != 0) { 
                    mfs[i].strokeWeight = tS[i] / hScale;
                }
                applyInset(mfs[i], tI[i], hScale, vScale);
                mfs[i].textFramePreferences.textColumnGutter = tG[i] / hScale;
                mfs[i].topLeftCornerRadius = cO[i].tl / hScale;
                mfs[i].topRightCornerRadius = cO[i].tr / hScale;
                mfs[i].bottomLeftCornerRadius = cO[i].bl / hScale;
                mfs[i].bottomRightCornerRadius = cO[i].br / hScale;
                mfs[i].transform(CoordinateSpaces.pasteboardCoordinates, [AnchorPoint.topLeftAnchor, BB], smx.invertMatrix());
                mfs[i].reframe([IC, BB], [originalTL[i], oldBR[i]]);
            }
        }
    }
}

function applyInset(theFrame, theInset, hScale, vScale) {
    var temp;
    if (theInset instanceof Array) { 
        temp = [].concat(theInset);
        temp[0] /= vScale;
        temp[1] /= hScale;
        temp[2] /= vScale;
        temp[3] /= hScale;
    } else {
        temp = theInset / hScale;
    }
    theFrame.textFramePreferences.insetSpacing = temp;
}

function findFramesByObjectStyle() {
    var s = app.activeDocument.allObjectStyles;
    app.findObjectPreferences = null;
    
    for (var i = 0; i < s.length; i += 1) { 
        if (s[i].id == app.activeDocument.extractLabel("FitTextObjectStyle")) { 
            break;
        }
    }
    if (i == s.length) { 
        i = 0;
    }
    app.findObjectPreferences.appliedObjectStyles = s[i];
    
    app.findChangeObjectOptions.objectType = ObjectTypes.TEXT_FRAMES_TYPE;
    return app.activeDocument.findObject();
}

function findFramesByParagraphStyle() {
    var selectedStyleId = app.activeDocument.extractLabel("FitTextParagraphStyle");
    var allFrames = app.activeDocument.textFrames;
    var matchingFrames = [];
    
    for (var i = 0; i < allFrames.length; i++) {
        var frame = allFrames[i];
        try {
            // Buscar en todos los párrafos del marco
            for (var j = 0; j < frame.parentStory.paragraphs.length; j++) {
                var paragraph = frame.parentStory.paragraphs[j];
                if (paragraph.appliedParagraphStyle.id.toString() == selectedStyleId) {
                    // Verificar que el párrafo está en este marco específico
                    if (paragraph.parentTextFrames.length > 0) {
                        for (var k = 0; k < paragraph.parentTextFrames.length; k++) {
                            if (paragraph.parentTextFrames[k] == frame) {
                                matchingFrames.push(frame);
                                break;
                            }
                        }
                    }
                    break; // Si encontramos el estilo en este marco, no necesitamos seguir buscando
                }
            }
        } catch (e) {
            // Continuar si hay error con este marco
        }
    }
    
    return matchingFrames;
}

function findFramesByCharacterStyle() {
    var selectedStyleId = app.activeDocument.extractLabel("FitTextCharacterStyle");
    var allFrames = app.activeDocument.textFrames;
    var matchingFrames = [];
    
    for (var i = 0; i < allFrames.length; i++) {
        var frame = allFrames[i];
        try {
            // Buscar en todos los caracteres del marco
            for (var j = 0; j < frame.parentStory.characters.length; j++) {
                var character = frame.parentStory.characters[j];
                if (character.appliedCharacterStyle.id.toString() == selectedStyleId) {
                    // Verificar que el carácter está en este marco específico
                    if (character.parentTextFrames.length > 0) {
                        for (var k = 0; k < character.parentTextFrames.length; k++) {
                            if (character.parentTextFrames[k] == frame) {
                                matchingFrames.push(frame);
                                break;
                            }
                        }
                    }
                    break; // Si encontramos el estilo en este marco, no necesitamos seguir buscando
                }
            }
        } catch (e) {
            // Continuar si hay error con este marco
        }
    }
    
    return matchingFrames;
}

function findFrames(noStyle) {
    var s = app.activeDocument.allObjectStyles;
    app.findObjectPreferences = null;
    
    if (noStyle != true) { 
        for (var i = 0; i < s.length; i += 1) { 
            if (s[i].id == app.activeDocument.extractLabel("FitTextObjectStyle")) { 
                break;
            }
        }
        if (i == s.length) { 
            i = 0;
        }
        app.findObjectPreferences.appliedObjectStyles = s[i];
    }
    
    app.findChangeObjectOptions.objectType = ObjectTypes.TEXT_FRAMES_TYPE;
    return app.activeDocument.findObject();
}

function showUI() {
    function showHideStyleDropdown() {
        // Limpiar dropdowns existentes
        if (w.objectStyleDropdown) {
            w.scopePanel.remove(w.objectStyleDropdown);
            w.objectStyleDropdown = null;
        }
        if (w.paragraphStyleDropdown) {
            w.scopePanel.remove(w.paragraphStyleDropdown);
            w.paragraphStyleDropdown = null;
        }
        if (w.characterStyleDropdown) {
            w.scopePanel.remove(w.characterStyleDropdown);
            w.characterStyleDropdown = null;
        }
        
        // Mostrar dropdown apropiado según selección
        if (w.selectionObjectStyle.value == true) { 
            w.objectStyleDropdown = w.scopePanel.add("dropdownlist", undefined, objectStyles);
            w.objectStyleDropdown.title = "Estilo de Objeto: ";
            w.objectStyleDropdown.selection = objectStyleSelectionWas !== null ? objectStyleSelectionWas : 0;
            w.objectStyleDropdown.alignment = "fill";
            
            if (app.activeDocument.extractLabel("FitTextObjectStyle") !== "") { 
                for (var i = 0; i < objectStyles.length; i += 1) { 
                    if (app.activeDocument.extractLabel("FitTextObjectStyle") == app.activeDocument.allObjectStyles[i].id) { 
                        w.objectStyleDropdown.selection = i;
                        break;
                    }
                }
            }
        }
        
        if (w.selectionParagraphStyle.value == true) { 
            w.paragraphStyleDropdown = w.scopePanel.add("dropdownlist", undefined, paragraphStyles);
            w.paragraphStyleDropdown.title = "Estilo de Párrafo: ";
            w.paragraphStyleDropdown.selection = paragraphStyleSelectionWas !== null ? paragraphStyleSelectionWas : 0;
            w.paragraphStyleDropdown.alignment = "fill";
            
            if (app.activeDocument.extractLabel("FitTextParagraphStyle") !== "") { 
                for (var i = 0; i < paragraphStyles.length; i += 1) { 
                    if (app.activeDocument.extractLabel("FitTextParagraphStyle") == app.activeDocument.allParagraphStyles[i].id) { 
                        w.paragraphStyleDropdown.selection = i;
                        break;
                    }
                }
            }
        }
        
        if (w.selectionCharacterStyle.value == true) { 
            w.characterStyleDropdown = w.scopePanel.add("dropdownlist", undefined, characterStyles);
            w.characterStyleDropdown.title = "Estilo de Carácter: ";
            w.characterStyleDropdown.selection = characterStyleSelectionWas !== null ? characterStyleSelectionWas : 0;
            w.characterStyleDropdown.alignment = "fill";
            
            if (app.activeDocument.extractLabel("FitTextCharacterStyle") !== "") { 
                for (var i = 0; i < characterStyles.length; i += 1) { 
                    if (app.activeDocument.extractLabel("FitTextCharacterStyle") == app.activeDocument.allCharacterStyles[i].id) { 
                        w.characterStyleDropdown.selection = i;
                        break;
                    }
                }
            }
        }
        
        var fl = w.frameLocation;
        w.layout.layout(true);
        w.frameLocation = fl;
    }
    
    // Obtener todos los estilos
    var objectStyles = getAllStyles(app.activeDocument.allObjectStyles, ObjectStyleGroup);
    var paragraphStyles = getAllStyles(app.activeDocument.allParagraphStyles, ParagraphStyleGroup);
    var characterStyles = getAllStyles(app.activeDocument.allCharacterStyles, CharacterStyleGroup);
    
    var objectStyleSelectionWas = null;
    var paragraphStyleSelectionWas = null;
    var characterStyleSelectionWas = null;
    
    var w = new Window("dialog", "Fit Text to Frame");
    
    with (w) {
        orientation = "row";
        
        with (add("group")) {
            orientation = "column";
            alignment = ["fill", "fill"];
            
            with (w.scopePanel = add("panel", undefined, "Alcance")) {
                alignment = ["fill", "fill"];
                alignChildren = "left";
                margins.top = 17;
                spacing = 3;
                
                w.selectionCurrent = add("radiobutton", undefined, "Solo marcos de texto seleccionados");
                w.selectionDoc = add("radioButton", undefined, "Todos los marcos de texto del documento");
                w.selectionObjectStyle = add("radioButton", undefined, "Marcos con este estilo de objeto:");
                w.selectionParagraphStyle = add("radioButton", undefined, "Marcos con este estilo de párrafo:");
                w.selectionCharacterStyle = add("radioButton", undefined, "Marcos con este estilo de carácter:");
                w.selectionCurrent.value = true;
                
                var currentScope = app.activeDocument.extractLabel("FitTextScope");
                if (currentScope !== "") { 
                    if (currentScope == "selectionCurrent") w.selectionCurrent.value = true;
                    else if (currentScope == "selectionDoc") w.selectionDoc.value = true;
                    else if (currentScope == "selectionObjectStyle") w.selectionObjectStyle.value = true;
                    else if (currentScope == "selectionParagraphStyle") w.selectionParagraphStyle.value = true;
                    else if (currentScope == "selectionCharacterStyle") w.selectionCharacterStyle.value = true;
                }
            }
            
            with (add("panel", undefined, "Opciones")) {
                alignment = ["fill", "fill"];
                alignChildren = "left";
                margins.top = 17;
                spacing = 10;
                
                with (add("group")) {
                    orientation = "column";
                    alignment = ["fill", "fill"];
                    alignChildren = "left";
                    spacing = 3;
                    
                    w.reduceOrEnlarge = add("radioButton", undefined, "Reducir o ampliar texto según sea necesario");
                    w.reduce = add("radioButton", undefined, "Solo reducir texto, nunca ampliar");
                    w.enlarge = add("radioButton", undefined, "Solo ampliar texto, nunca reducir");
                }
                
                w.reduceOrEnlarge.value = true;
                if (app.activeDocument.extractLabel("FitTextMode") !== "") { 
                    w[app.activeDocument.extractLabel("FitTextMode")].value = true;
                }
                
                with (add("panel")) {
                    alignment = ["fill", "fill"];
                    minimumSize.height = maximumSize.height = 1;
                }
                
                w.horizontalOnly = add("checkbox", undefined, "Ajustar solo el ancho");
                w.horizontalOnly.spacing = 10;
                w.horizontalOnly.value = false;
                if (app.activeDocument.extractLabel("FitTextWidthOnly") === "true") { 
                    w.horizontalOnly.value = true;
                }
            }
        }
        
        with (add("group")) {
            orientation = "column";
            alignment = ["right", "fill"];
            
            w.ok = add("button", undefined, "OK");
            w.ok.characters = 8;
            
            w.cancel = add("button", undefined, "Cancelar");
            w.cancel.alignment = ["right", "bottom"];
            w.cancel.characters = 8;
        }
    }
    
    // Asignar eventos
    w.selectionObjectStyle.onClick = showHideStyleDropdown;
    w.selectionParagraphStyle.onClick = showHideStyleDropdown;
    w.selectionCharacterStyle.onClick = showHideStyleDropdown;
    w.selectionCurrent.onClick = showHideStyleDropdown;
    w.selectionDoc.onClick = showHideStyleDropdown;
    w.onShow = showHideStyleDropdown;
    
    var r = w.show();
    
    // Guardar configuraciones
    if (w.selectionCurrent.value) { 
        app.activeDocument.insertLabel("FitTextScope", "selectionCurrent");
    }
    if (w.selectionDoc.value) { 
        app.activeDocument.insertLabel("FitTextScope", "selectionDoc");
    }
    if (w.selectionObjectStyle.value) { 
        app.activeDocument.insertLabel("FitTextScope", "selectionObjectStyle");
    }
    if (w.selectionParagraphStyle.value) { 
        app.activeDocument.insertLabel("FitTextScope", "selectionParagraphStyle");
    }
    if (w.selectionCharacterStyle.value) { 
        app.activeDocument.insertLabel("FitTextScope", "selectionCharacterStyle");
    }
    
    if (w.reduceOrEnlarge.value) { 
        app.activeDocument.insertLabel("FitTextMode", "reduceOrEnlarge");
    }
    if (w.reduce.value) { 
        app.activeDocument.insertLabel("FitTextMode", "reduce");
    }
    if (w.enlarge.value) { 
        app.activeDocument.insertLabel("FitTextMode", "enlarge");
    }
    
    // Guardar selecciones de estilos
    if ((w.objectStyleDropdown) && (w.objectStyleDropdown.selection !== undefined)) { 
        app.activeDocument.insertLabel("FitTextObjectStyle", "" + app.activeDocument.allObjectStyles[w.objectStyleDropdown.selection.index].id);
    }
    
    if ((w.paragraphStyleDropdown) && (w.paragraphStyleDropdown.selection !== undefined)) { 
        app.activeDocument.insertLabel("FitTextParagraphStyle", "" + app.activeDocument.allParagraphStyles[w.paragraphStyleDropdown.selection.index].id);
    }
    
    if ((w.characterStyleDropdown) && (w.characterStyleDropdown.selection !== undefined)) { 
        app.activeDocument.insertLabel("FitTextCharacterStyle", "" + app.activeDocument.allCharacterStyles[w.characterStyleDropdown.selection.index].id);
    }
    
    if (w.horizontalOnly.value) { 
        app.activeDocument.insertLabel("FitTextWidthOnly", "true");
    } else {
        app.activeDocument.insertLabel("FitTextWidthOnly", "false");
    }
    
    return r;
}

function getAllStyles(allStyles, groupObj) {
    function getFullName(styleObj, groupObj) {
        var climbing = styleObj.parent;
        var s = styleObj.name;
        var g = "";
        
        while (climbing instanceof groupObj) {
            if (g != "") { 
                g = ":" + g;
            }
            g = climbing.name + g;
            climbing = climbing.parent;
        }
        
        if (g != "") { 
            g = " (" + g + ")";
            s = s + g;
        }
        return s;
    }
    
    var s = [];
    for (var i = 0; i < allStyles.length; i += 1) { 
        s.push(getFullName(allStyles[i], groupObj));
    }
    return s;
}

// Ejecutar el script principal
try {
    app.doScript(main, undefined, undefined, UndoModes.ENTIRE_SCRIPT, "Fit Text to Frame");
} catch (e) {
    alert("Error al ejecutar el script: " + e.message);
}