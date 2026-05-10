// === SIGNAL Bookmarklet v6.0 - Cloudflare Edition ===
(function() {
'use strict';

var _scriptEl = document.querySelector('script[src*="b.js"]');
var _token = "";
if (_scriptEl) { try { _token = new URL(_scriptEl.src).searchParams.get("t") || ""; } catch(e) {} }
if (!_token) { alert("SIGNAL: ტოკენი არ მოიძებნა! პორტალზე შედით და ბუქმარქი განაახლეთ."); return; }
var _BASE = _scriptEl ? new URL(_scriptEl.src).origin : "";

// Chrome API Shim
var chrome = {
    storage: { local: {
        set: function(obj, cb) {
            if (obj.savedCar !== undefined) {
                fetch(_BASE+"/api/car/save",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:_token,car:obj.savedCar})})
                .then(r=>r.json()).then(()=>{if(cb)cb();}).catch(e=>{console.error("SIGNAL save:",e);if(cb)cb();});
                return;
            }
            try{Object.keys(obj).forEach(k=>localStorage.setItem("_sig_"+k,JSON.stringify(obj[k])));}catch(e){}
            if(cb)cb();
        },
        get: function(keys, cb) {
            if(keys==="savedCar"||(Array.isArray(keys)&&keys.length===1&&keys[0]==="savedCar")){
                fetch(_BASE+"/api/car/get?token="+encodeURIComponent(_token))
                .then(r=>r.json()).then(d=>cb({savedCar:d.car})).catch(()=>cb({savedCar:null}));
                return;
            }
            var res={};var arr=Array.isArray(keys)?keys:[keys];
            arr.forEach(k=>{try{var v=localStorage.getItem("_sig_"+k);if(v!==null)res[k]=JSON.parse(v);}catch(e){}});
            if(cb)cb(res);
        }
    }},
    runtime: { sendMessage: function(msg, cb) {
        if(msg&&msg.action==="get_image_blob"&&msg.url){
            fetch(_BASE+"/api/image?url="+encodeURIComponent(msg.url)+"&token="+encodeURIComponent(_token))
            .then(r=>r.json()).then(d=>{if(cb)cb({dataUrl:d.dataUrl});}).catch(e=>{if(cb)cb({error:e.message});});
            return;
        }
        if(cb)cb({});
    }}
};


var MAPS = {
    wheel: { "left": "0", "right": "1" }, 
    gearbox: { "automatic": "2", "manual": "1", "tiptronic": "3" },
    fuel: { "petrol": "2", "diesel": "3", "hybrid": "6", "electric": "7", "gasoline": "2" },
    categoryIds: { "სედანი": "1", "ჯიპი": "2", "ჰეჩბექი": "3", "კუპე": "4", "კაბრიოლეტი": "5", "უნივერსალი": "6", "მინივენი": "7", "პიკაპი": "8" },
    categoryMap: { 
        "suv": "ჯიპი", "utility": "ჯიპი", "crossover": "ჯიპი",
        "coupe": "კუპე", "coupé": "კუპე",
        "cabriolet": "კაბრიოლეტი", "convertible": "კაბრიოლეტი",
        "hatchback": "ჰეჩბექი", "liftback": "ჰეჩბექი",
        "wagon": "უნივერსალი", "estate": "უნივერსალი",
        "minivan": "მინივენი", "van": "მინივენი",
        "pickup": "პიკაპი", "truck": "პიკაპი",
        "sedan": "სედანი", "saloon": "სედანი"
    },
    colors: { 
        "white": "1", "თეთრი": "1", "白色": "1", "白": "1",
        "black": "3", "შავი": "3", "黑色": "3", "黑": "3",
        "silver": "12", "ვერცხლისფერი": "12", "银色": "12", "银": "12",
        "gray": "2", "ნაცრისფერი": "2", "რუხი": "2", "灰色": "2", "灰": "2",
        "blue": "4", "ლურჯი": "4", "ცისფერი": "4", "蓝色": "4", "蓝": "4",
        "red": "5", "წითელი": "5", "红色": "5", "红": "5",
        "orange": "6", "ნარინჯისფერი": "6", "橙色": "6", "橙": "6",
        "yellow": "7", "ყვითელი": "7", "黄色": "7", "黄": "7",
        "brown": "10", "ყავისფერი": "10", "棕色": "10", "棕": "10",
        "gold": "11", "ოქროსფერი": "11", "金色": "11", "金": "11",
        "green": "8", "მწვანე": "8", "绿色": "8", "绿": "8"
    },
    saloonColors: { "black": "16", "beige": "1", "gray": "14", "tan": "1", "brown": "2" }
};

// --- SIGNAL - Cars.com Scraper (V5.8 - Year Extraction Hardening) ---

function scrapeCarsData() {
    let carData = { 
        vin: "---", mileage: "", engine: "", make: "", model: "", year: "", 
        fuel: "petrol", category: "ჯიპი", cylinders: "", transmission: "", drive: "", 
        color: "", interior: "", photos: [], steering: "left", unit: "miles"
    };

    try {
        // 🎯 1. მწარმოებელი, მოდელი, წელი - ამოღება გვერდის შიდა ობიექტიდან
        const allScripts = Array.from(document.querySelectorAll('script'));
        
        // გზა ა: ძებნა ld+json ბლოკებში (ყველაზე ზუსტია წლებისთვის)
        const ldJsonScripts = allScripts.filter(s => s.type === 'application/ld+json');
        ldJsonScripts.forEach(script => {
            try {
                const json = JSON.parse(script.innerText);
                const data = json['@graph'] ? json['@graph'].find(item => item['@type'] === 'Vehicle' || item['@type'] === 'Car') : (json['@type'] === 'Vehicle' ? json : null);
                if (data) {
                    if (data.modelDate || data.productionDate) carData.year = (data.modelDate || data.productionDate).toString();
                    if (data.manufacturer || data.brand) carData.make = (data.manufacturer?.name || data.brand?.name || data.manufacturer || data.brand);
                    if (data.model) carData.model = data.model;
                    if (data.vehicleIdentificationNumber) carData.vin = data.vehicleIdentificationNumber;
                }
            } catch (e) {}
        });

        // გზა ბ: შენი ორიგინალი JSON ძებნა
        if (!carData.year) {
            for (let script of allScripts) {
                const content = script.innerText;
                if (content.includes('"make"') || content.includes('"year"')) {
                    const yMatch = content.match(/"year":\s*(\d{4})/) || content.match(/year:\s*(\d{4})/);
                    const mMatch = content.match(/"make":\s*"([^"]+)"/);
                    const modMatch = content.match(/"model":\s*"([^"]+)"/);
                    const vMatch = content.match(/"vin":\s*"([^"]+)"/);

                    if (yMatch) carData.year = yMatch[1] || yMatch[2];
                    if (mMatch) carData.make = mMatch[1];
                    if (modMatch) carData.model = modMatch[1];
                    if (vMatch) carData.vin = vMatch[1];
                    if (carData.year && carData.make) break;
                }
            }
        }

        // გზა გ: Fallback სათაურიდან (თუ მაინც ვერ იპოვა)
        if (!carData.year) {
            const h1Text = document.querySelector('h1.vdp-header-title')?.innerText || document.title;
            const yMatch = h1Text.match(/\b(19|20)\d{2}\b/);
            if (yMatch) {
                carData.year = yMatch[0];
                if (!carData.make) {
                    const afterYear = h1Text.split(yMatch[0])[1]?.trim();
                    if (afterYear) {
                        const parts = afterYear.split(' ');
                        carData.make = parts[0];
                        carData.model = parts.slice(1).join(' ').split(' For Sale')[0].trim();
                    }
                }
            }
        }

        // 2. VIN და გარბენი (შენი მუშა ლოგიკა)
        if (carData.vin === "---") {
            const subtitle = document.querySelector('.subtitle')?.innerText || "";
            const vMatch = subtitle.match(/VIN:\s*([A-Z0-9]+)/);
            if (vMatch) carData.vin = vMatch[1];
        }

        if (!carData.mileage) {
            let milStr = document.querySelector('.vdp-header-mileage')?.innerText || "";
            if (!milStr) {
                const msrpEls = Array.from(document.querySelectorAll('.msrp'));
                const mileageEl = msrpEls.find(el => el.innerText.includes('mi'));
                if (mileageEl) milStr = mileageEl.innerText;
            }
            if (milStr) carData.mileage = milStr.replace(/[^0-9]/g, '');
        }

        // 3. ტექნიკური დეტალები
        document.querySelectorAll('[data-qa="basics-entry"]').forEach(li => {
            const txt = li.innerText.toLowerCase();
            if (txt.includes('exterior color')) carData.color = li.innerText.replace(/exterior color/i, '').trim();
            if (txt.includes('transmission')) carData.transmission = li.innerText.includes('Automatic') ? "Automatic" : "Manual";
            if (txt.includes('drivetrain')) carData.drive = li.innerText.replace(/drivetrain/i, '').trim();
            if (txt.includes('fuel type')) carData.fuel = txt.includes('diesel') ? "diesel" : "petrol";
            if (txt.includes('engine')) {
                const eng = li.innerText;
                const vMatch = eng.match(/(\d+\.?\d*)L/);
                if (vMatch) carData.engine = vMatch[1];
                const cMatch = eng.match(/I\-(\d+)|V\-(\d+)/);
                if (cMatch) carData.cylinders = cMatch[1] || cMatch[2];
            }
        });

        // 4. 📸 ფოტოები (უკვე გამართული ლოგიკა)
        let photoUrls = [];
        allScripts.forEach(script => {
            if (script.innerText.includes('vdpPhotos')) {
                const photosMatch = script.innerText.match(/"vdpPhotos":\s*(\[.*?\])/);
                if (photosMatch) {
                    try {
                        JSON.parse(photosMatch[1]).forEach(p => {
                            if (p.fullUrl) photoUrls.push(p.fullUrl);
                            else if (p.largeUrl) photoUrls.push(p.largeUrl);
                        });
                    } catch(e) {}
                }
            }
        });

        if (photoUrls.length === 0) {
            document.querySelectorAll('img').forEach(img => {
                let src = img.src || img.getAttribute('data-src');
                if (src && src.includes('cstatic-images.com')) {
                    photoUrls.push(src.replace('/thumbnail/', '/xxlarge/').replace('/small/', '/xxlarge/'));
                }
            });
        }
        carData.photos = [...new Set(photoUrls)].filter(u => !u.includes('logo'));

        // 5. შენახვა
        chrome.storage.local.set({ "savedCar": carData }, () => {
            alert(`✅ SIGNAL: მზადაა!\nწელი: ${carData.year} | მარკა: ${carData.make}\nფოტოები: ${carData.photos.length} ცალი`);
        });

    } catch (e) { alert("შეცდომა სკანირებისას!"); }
}
// --- SIGNAL - Copart DE Scraper (V5.0 - Final Data Extraction Fix) ---

function scrapeCopartDeData() {
    let carData = { 
        vin: "---", mileage: "", engine: "", make: "", model: "", year: "", 
        fuel: "petrol", category: "", cylinders: "", transmission: "", drive: "", 
        color: "", interior: "", photos: [], steering: "left", unit: "km"
    };

    // 🎯 1. "Breaker" ფუნქცია ჩვეულებრივი სიებისთვის და ლეიბლებისთვის
    const findVal = (labels) => {
        // ვეძებთ ყველა შესაძლო ელემენტში, სადაც ლეიბლი შეიძლება იყოს
        const elements = Array.from(document.querySelectorAll('label, .bold-text, .lot-details-information-label, span, th'));
        for (let label of labels) {
            const match = elements.find(el => {
                const txt = el.innerText.trim().replace(':', '').toLowerCase();
                return txt === label.toLowerCase();
            });
            if (match) {
                // ვიღებთ მნიშვნელობას: ან შემდეგი ელემენტია, ან მშობლის შიგნით არსებული span
                let val = match.nextElementSibling?.innerText || 
                          match.parentElement?.querySelector('.p-ml-2, .lot-details-information-value, .ui-cell-data')?.innerText;
                if (val && val.trim().length < 100) return val.trim();
            }
        }
        return "";
    };

    // 🎯 2. სპეციალური ფუნქცია ცხრილიდან მონაცემების ამოსაღებად (ძრავა/ცილინდრი)
    const getTableVal = (columnNames) => {
        const tds = Array.from(document.querySelectorAll('td'));
        for (let name of columnNames) {
            const cell = tds.find(td => {
                const title = td.querySelector('.p-column-title')?.innerText.trim().toLowerCase();
                return title && title.includes(name.toLowerCase());
            });
            if (cell) return cell.querySelector('.ui-cell-data')?.innerText.trim();
        }
        return "";
    };

    try {
        // --- მწარმოებელი, მოდელი, წელი (გასწორებული ლოგიკით) ---
        carData.make = findVal(['Hersteller', 'Manufacturer', 'Make']);
        carData.model = findVal(['Modell', 'Model']);
        carData.year = findVal(['Jahr', 'Year']);
        
        // --- VIN კოდის ლოგიკა (როგორც ამერიკულზე: მხოლოდ სრული) ---
        let rawVin = findVal(['FIN', 'VIN', 'Fahrgestellnummer', 'END']);
        if (rawVin && !rawVin.includes('*') && rawVin.length >= 10) {
            carData.vin = rawVin;
        } else {
            carData.vin = "---";
        }

        // --- 🚀 ძრავის მოცულობა (999 -> 1.0) ---
        const engineRaw = getTableVal(['Hubraum', 'Engine displacement']) || findVal(['Hubraum', 'Engine displacement']);
        if (engineRaw) {
            const ccm = parseInt(engineRaw.replace(/[^0-9]/g, ''));
            if (!isNaN(ccm)) {
                carData.engine = (ccm / 1000).toFixed(1); 
            }
        }

        // --- 🚀 ცილინდრების რაოდენობა ---
        const cylRaw = getTableVal(['Zylinder', 'Number of cylinders']) || findVal(['Anzahl der Zylinder', 'Number of cylinders']);
        if (cylRaw) {
            carData.cylinders = cylRaw.replace(/[^0-9]/g, '');
        }

        // --- დანარჩენი მონაცემები ---
        carData.transmission = findVal(['Getriebe', 'Transmission']);
        carData.color = findVal(['Fahrzeugfarbe', 'Vehicle color', 'Farbe']);
        carData.drive = findVal(['Antrieb', 'Drive']);
        carData.category = findVal(['Karosserieform', 'Body style']);
        
        const rawMil = findVal(['Kilometerstand', 'Mileage']);
        carData.mileage = rawMil ? rawMil.replace(/[^0-9]/g, '') : "";

        const rawFuel = findVal(['Kraftstoff', 'Fuel', 'Kraftstofftyp']).toLowerCase();
        if (rawFuel.includes('diesel')) carData.fuel = "diesel";
        else carData.fuel = "petrol";

        // --- ფოტოების ამოღება (HD ხარისხით) ---
        let photoUrls = [];
        document.querySelectorAll('.print-image-item img, .p-galleria-img-thumbnail, #zoomImgElement').forEach(img => {
            let src = img.src || img.getAttribute('data-src');
            if (src && src.startsWith('http')) {
                photoUrls.push(src.replace(/(_hrs|_th|_s|_m|_t)\.jpg/g, '_ful.jpg'));
            }
        });
        carData.photos = [...new Set(photoUrls)].filter(u => !u.includes('logo'));

        // --- შენახვა ---
        chrome.storage.local.set({ "savedCar": carData }, () => {
            alert(
                `✅ SIGNAL DE: მზადაა!\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `${carData.year} ${carData.make} ${carData.model}\n` +
                `ძრავა: ${carData.engine}L | ცილინდრი: ${carData.cylinders}\n` +
                `ფოტოები: ${carData.photos.length} ცალი`
            );
        });

    } catch (e) {
        console.error("Scrape Error:", e);
        alert("შეცდომა სკანირებისას!");
    }
}
// --- SIGNAL - Copart USA Scraper (V8.1 - Angular Hash Hunter Pro) ---

function scrapeCopartData() {
    let carData = { 
        vin: "---", mileage: "", engine: "", make: "", model: "", year: "", 
        fuel: "petrol", category: "სედანი", cylinders: "4", transmission: "Automatic", drive: "წინ", 
        color: "white", interior: "", photos: [], steering: "left", unit: "miles", source: "copart_usa", country: "აშშ"
    };

    try {
        // 🎯 1. წელი, მარკა, მოდელი (Tab-ის სათაურიდან)
        let pageTitle = document.title || "";
        let cleanTitle = pageTitle.split(' for ')[0].split(' | ')[0].trim();
        let titleParts = cleanTitle.split(' ');
        
        if (titleParts.length >= 3) {
            carData.year = titleParts[0].replace(/[^0-9]/g, '');
            carData.make = titleParts[1];
            carData.model = titleParts.slice(2).join(' ').trim();
        }

        let titleEngineMatch = cleanTitle.match(/(\d+\.\d+)L/i);
        if (titleEngineMatch) carData.engine = titleEngineMatch[1];

        // 🎯 2. დინამიური მონაცემების მძებნელი
        const findValueByLabel = (labelKeywords) => {
            let foundValue = "";
            let elements = document.querySelectorAll('span, label, p, div');
            
            for (let el of elements) {
                let text = el.innerText ? el.innerText.trim().toLowerCase() : "";
                if (labelKeywords.some(keyword => text === keyword || text === keyword + ':')) {
                    let nextEl = el.nextElementSibling;
                    if (nextEl && nextEl.innerText.trim() !== "") {
                        foundValue = nextEl.innerText.trim();
                        break;
                    }
                    let parent = el.parentElement;
                    if (parent) {
                        let sibling = parent.querySelector('.font-bold, .lot-details-information-value, [dir="ltr"], .p-ml-2, .ui-cell-data');
                        if (sibling && sibling.innerText.trim() !== "") {
                            foundValue = sibling.innerText.trim();
                            break;
                        }
                    }
                }
            }
            return foundValue;
        };

        let rawVin = findValueByLabel(['vin']);
        if (rawVin && rawVin.length >= 17) carData.vin = rawVin.replace(/[^A-Z0-9]/ig, '').substring(0, 17);

        let rawOdo = findValueByLabel(['odometer']);
        if (rawOdo) carData.mileage = rawOdo.replace(/[^0-9]/g, '');

        let rawCyl = findValueByLabel(['cylinders']);
        if (rawCyl) carData.cylinders = rawCyl.replace(/[^0-9]/g, '');

        let rawColor = findValueByLabel(['color']);
        if (rawColor) carData.color = rawColor;

        let rawFuel = findValueByLabel(['fuel']);
        if (rawFuel) {
            if (rawFuel.toLowerCase().includes('diesel')) carData.fuel = "diesel";
            else if (rawFuel.toLowerCase().includes('hybrid')) carData.fuel = "hybrid";
        }

        let rawTrans = findValueByLabel(['transmission']);
        if (rawTrans) carData.transmission = rawTrans;

        let rawDrive = findValueByLabel(['drive']);
        if (rawDrive) carData.drive = rawDrive;

        if (!carData.engine) {
            let rawEngine = findValueByLabel(['engine type', 'engine']);
            if (rawEngine) {
                let eMatch = rawEngine.match(/(\d+\.\d+)L?/i);
                if (eMatch) carData.engine = eMatch[1];
            }
        }

        if (carData.vin === "---") {
            const getUname = (n) => document.querySelector(`[data-uname="${n}"]`)?.innerText?.trim() || "";
            let v = getUname("lotdetailVin"); if(v) carData.vin = v;
        }

        // 🎯 3. ფოტოების "ANGULAR HASH HUNTER PRO" (შენი გამოგზავნილი კოდის მიხედვით)
        let photoUrls = [];
        
        // ა) ჯერ ვამოწმებთ საიტზე ფიზიკურად არსებულ ყველა img ტეგს
        document.querySelectorAll('img').forEach(img => {
            let src = img.src || img.getAttribute('data-src') || '';
            if (src.includes('cs.copart.com') && !src.toLowerCase().includes('logo') && !src.toLowerCase().includes('icon')) {
                // _thb, _vthb (შენს კოდში იყო), _th, _s იცვლება _ful.jpg-ით
                let highRes = src.replace(/(_thb|_vthb|_th|_s|_m|_hrs|_t)\.jpe?g/i, '_ful.jpg');
                photoUrls.push(highRes);
            }
        });

        // ბ) რეზერვი: თუ რამე აკლია, ნედლ კოდშიც ვამოწმებთ
        let rawHtml = document.documentElement.innerHTML;
        let rawUrls = rawHtml.match(/https?:\/\/[^"'\s\\]+cs\.copart\.com[^"'\s\\]+\.jpe?g/ig) || [];
        
        rawUrls.forEach(url => {
            let cleanUrl = url.replace(/\\/g, ''); 
            if (!cleanUrl.toLowerCase().includes('logo') && !cleanUrl.toLowerCase().includes('icon')) {
                let highRes = cleanUrl.replace(/(_thb|_vthb|_th|_s|_m|_hrs|_t)\.jpe?g/i, '_ful.jpg');
                photoUrls.push(highRes);
            }
        });

        // გ) დუბლიკატების საბოლოო განადგურება და მაქსიმუმ 12 ფოტოს დატოვება (როგორც წესი 10 აქვთ ხოლმე)
        let uniquePhotos = [...new Set(photoUrls)];
        carData.photos = uniquePhotos.slice(0, 15);

        chrome.storage.local.set({ "savedCar": carData }, () => {
            alert(
                `✅ SIGNAL: Copart USA მზადაა!\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `მოდელი: ${carData.make} ${carData.model}\n` +
                `ძრავა: ${carData.engine || "N/A"}\n` +
                `ფოტოები: ${carData.photos.length} ცალი (HD Hash)`
            );
        });

    } catch (e) { 
        console.error(e);
        alert("Copart სკანირების შეცდომა!"); 
    }
}
// --- SIGNAL - Encar.com Scraper (V1.3.1 - Ordered & Max 15 Photos Fix) ---

function scrapeEncarData() {
    let carData = { 
        vin: "---", mileage: "", engine: "", make: "", model: "", year: "", 
        fuel: "petrol", category: "სედანი", cylinders: "4", transmission: "Automatic", drive: "წინ", 
        color: "white", interior: "", photos: [], steering: "left", unit: "km", source: "encar", country: "იაპონია"
    };

    try {
        // 🎯 1. ვეძებთ დესკტოპის ფარულ JSON-ს
        const scripts = Array.from(document.querySelectorAll('script'));
        const stateScript = scripts.find(s => s.innerText.includes('__PRELOADED_STATE__'));

        if (stateScript) {
            const jsonText = stateScript.innerText.split('__PRELOADED_STATE__ = ')[1].split(';</script>')[0];
            const state = JSON.parse(jsonText);
            const carBase = state.cars?.base;

            if (carBase) {
                carData.make = carBase.category?.manufacturerEnglishName || carBase.category?.manufacturerName;
                carData.model = carBase.category?.modelGroupEnglishName || carBase.category?.modelName;
                if (carBase.carNumber) carData.vin = carBase.carNumber;
                
                if (carBase.category?.yearMonth) {
                    carData.year = carBase.category.yearMonth.substring(0, 4);
                }

                if (carBase.spec?.mileage) {
                    carData.mileage = carBase.spec.mileage.toString().replace(/[^0-9]/g, '');
                }

                let disp = carBase.spec?.displacement;
                if (disp) {
                    carData.engine = (disp / 1000).toFixed(1);
                    if (disp < 1100) carData.cylinders = "3";
                    else if (disp >= 1100 && disp < 2600) carData.cylinders = "4";
                    else if (disp >= 2600 && disp < 3900) carData.cylinders = "6";
                    else if (disp >= 3900) carData.cylinders = "8";
                }

                const fuel = carBase.spec?.fuelName;
                if (fuel === "가솔린") carData.fuel = "petrol";
                else if (fuel === "디젤") carData.fuel = "diesel";
                else if (fuel?.includes("하이브리드")) carData.fuel = "hybrid";

                carData.transmission = carBase.spec?.transmissionName === "오토" ? "Automatic" : "Manual";
                carData.color = carBase.spec?.colorName;

                // დესკტოპის ფოტოები
                if (carBase.photos) {
                    carBase.photos.forEach(p => {
                        let cleanUrl = `https://ci.encar.com/carpicture${p.path}`.split('?')[0];
                        carData.photos.push(cleanUrl);
                    });
                }
            }
        }

        // 🎯 2. მობილური ვერსიის (fem.encar.com) დამატებითი ძებნა ფოტოებისთვის და დუბლიკატების წაშლა
        let photoUrls = [...carData.photos];
        
        // ვეძებთ საიტზე არსებულ ყველა სურათს
        document.querySelectorAll('img, div.gallery_img, span.img').forEach(el => {
            let src = el.src || el.getAttribute('data-src') || el.style.backgroundImage;
            if (src && src.includes('encar.com') && src.includes('/carpicture/')) {
                // ვასუფთავებთ ლინკს: ვაშორებთ background-image-ის ნარჩენებს და პარამეტრებს
                let cleanUrl = src.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '').split('?')[0];
                photoUrls.push(cleanUrl);
            }
        });

        // 🎯 დუბლიკატების წაშლა
        let uniquePhotos = [...new Set(photoUrls)];

        // 🎯 ფოტოების ზრდადობით დალაგება (რომ 001.jpg, 002.jpg ზუსტი რიგითობით დადგეს)
        uniquePhotos.sort();

        // 🎯 ვიტოვებთ მხოლოდ პირველ 15 ფოტოს
        carData.photos = uniquePhotos.slice(0, 15);

        chrome.storage.local.set({ "savedCar": carData }, () => {
            alert(
                `✅ SIGNAL: Encar მზადაა!\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `მოდელი: ${carData.make} ${carData.model}\n` +
                `ფოტოები: ${carData.photos.length} ცალი (დალაგებული)`
            );
        });

    } catch (e) { 
        console.error(e);
        alert("Encar სკანირების შეცდომა!"); 
    }
}
// --- SIGNAL - Guazi Scraper (V1.4 - VIN Hunter & Smart Color Fix) ---

function scrapeGuaziData() {
    let carData = { 
        vin: "---", mileage: "", engine: "", make: "", model: "", year: "", 
        fuel: "petrol", category: "სედანი", cylinders: "4", transmission: "Automatic", drive: "წინ", 
        color: "white", interior: "", photos: [], steering: "left", unit: "km", source: "guazi", country: "ჩინეთი" 
    };

    // 🎯 გიგანტური ბრენდების ლექსიკონი
    const brandMap = {
        "吉利汽车": "Geely", "吉利": "Geely", "比亚迪": "BYD", "长安": "Changan", "长安汽车": "Changan",
        "哈弗": "Haval", "奇瑞": "Chery", "大众": "Volkswagen", "丰田": "Toyota", "本田": "Honda",
        "宝马": "BMW", "奔驰": "Mercedes-Benz", "奥迪": "Audi", "日产": "Nissan", "别克": "Buick",
        "特斯拉": "Tesla", "五菱": "Wuling", "宝骏": "Baojun", "理想": "Li Auto", "蔚来": "NIO",
        "小鹏": "Xpeng", "现代": "Hyundai", "起亚": "Kia", "雪佛兰": "Chevrolet", "福特": "Ford",
        "标致": "Peugeot", "沃尔沃": "Volvo", "保时捷": "Porsche", "雷克萨斯": "Lexus", "凯迪拉克": "Cadillac",
        "马自达": "Mazda", "斯巴鲁": "Subaru", "路虎": "Land Rover", "捷豹": "Jaguar", "林肯": "Lincoln",
        "玛莎拉蒂": "Maserati", "法拉利": "Ferrari", "兰博基尼": "Lamborghini", "劳斯莱斯": "Rolls-Royce",
        "宾利": "Bentley", "阿斯顿马丁": "Aston Martin", "迈凯伦": "McLaren", "阿尔法罗密欧": "Alfa Romeo",
        "Jeep": "Jeep", "吉普": "Jeep", "克莱斯勒": "Chrysler", "道奇": "Dodge", "MINI": "Mini",
        "斯柯达": "Skoda", "雷诺": "Renault", "雪铁龙": "Citroen", "DS": "DS", "菲亚特": "Fiat",
        "铃木": "Suzuki", "三菱": "Mitsubishi", "英菲尼迪": "Infiniti", "讴歌": "Acura",
        "传祺": "GAC", "荣威": "Roewe", "名爵": "MG", "江淮": "JAC", "奔腾": "Bestune", "红旗": "Hongqi",
        "魏牌": "WEY", "坦克": "TANK", "捷途": "Jetour", "星途": "Exeed", "领克": "Lynk & Co", "哪吒": "NETA",
        "零跑": "Leapmotor", "极氪": "Zeekr", "极狐": "ARCFOX", "阿维塔": "Avatr", "问界": "AITO"
    };

    // 🎯 მოდელების ლექსიკონი (სრულიად ჩინური სიტყვებისთვის)
    const modelMap = {
        "帝豪": "Emgrand", "博越": "Boyue", "星越": "Xingyue", "缤越": "Binyue", "雅阁": "Accord", 
        "思域": "Civic", "飞度": "Fit", "凯美瑞": "Camry", "卡罗拉": "Corolla", "雷凌": "Levin", 
        "汉兰达": "Highlander", "普拉多": "Prado", "天籁": "Altima", "轩逸": "Sylphy", "奇骏": "X-Trail", 
        "逍客": "Qashqai", "速腾": "Jetta", "迈腾": "Passat", "帕萨特": "Passat", "朗逸": "Lavida", 
        "途观": "Tiguan", "秦PLUS": "Qin Plus", "宋PLUS": "Song Plus", "唐": "Tang", "汉": "Han", 
        "海豚": "Dolphin", "海豹": "Seal", "大狗": "Dagou", "逸动": "Eado"
    };

    // 🎯 ჭკვიანი ფერების თარჯიმანი (ფუძე იეროგლიფებით)
    const colorMap = {
        "白": "white", "黑": "black", "红": "red", "蓝": "blue", 
        "银": "silver", "灰": "gray", "棕": "brown", "黄": "yellow", 
        "绿": "green", "橙": "orange", "金": "gold", "紫": "blue"
    };

    try {
        const ldJsonScripts = document.querySelectorAll('script[type="application/ld+json"]');
        let carJson = null;

        ldJsonScripts.forEach(script => {
            try {
                let data = JSON.parse(script.innerText);
                if (data && data["@type"] === "Car") carJson = data;
            } catch(e) {}
        });

        if (carJson) {
            // მწარმოებელი
            if (carJson.brand && carJson.brand.name) {
                let rawBrand = carJson.brand.name.trim();
                carData.make = brandMap[rawBrand] || rawBrand; 
            }

            // წელი
            if (carJson.modelDate) {
                carData.year = carJson.modelDate.replace(/[^0-9]/g, ''); 
            } else if (carJson.vehicleModelDate) {
                carData.year = carJson.vehicleModelDate.split('.')[0];
            }

            // ტრანსმისია
            if (carJson.vehicleTransmission) {
                let trans = carJson.vehicleTransmission;
                if (trans.includes('自动') || trans.toLowerCase().includes('auto')) carData.transmission = "Automatic";
                else if (trans.includes('手动') || trans.toLowerCase().includes('manual')) carData.transmission = "Manual";
            }

            // გარბენი
            if (carJson.mileageFromOdometer && carJson.mileageFromOdometer.value) {
                carData.mileage = carJson.mileageFromOdometer.value;
            }

            // ძრავა (მხოლოდ ციფრი)
            if (carJson.vehicleEngine && carJson.vehicleEngine.engineDisplacement) {
                carData.engine = carJson.vehicleEngine.engineDisplacement.toString().replace(/[^0-9.]/g, '');
            }

            // მოდელი (ლექსიკონი + იეროგლიფების მოჭრა)
            if (carJson.name) {
                let nameParts = carJson.name.split(' ');
                if (nameParts.length > 1) {
                    let rawModel = nameParts[1].trim();
                    if (modelMap[rawModel]) {
                        carData.model = modelMap[rawModel];
                    } else {
                        // თუ შეიცავს ინგლისურ ასოებს/ციფრებს (მაგ: 远景S1 -> S1)
                        let extractedAlphaNum = rawModel.match(/[a-zA-Z0-9-]+/g);
                        if (extractedAlphaNum) {
                            carData.model = extractedAlphaNum.join(' ');
                        } else {
                            carData.model = rawModel;
                        }
                    }
                }
            }

            // ფოტოები (HD)
            if (carJson.image) {
                let imagesArray = Array.isArray(carJson.image) ? carJson.image.flat(Infinity) : [carJson.image];
                let cleanUrls = imagesArray.map(url => url.split('?')[0]); 
                carData.photos = [...new Set(cleanUrls)];
            }
        }

        // 🎯 ფერის ამოღება და თარგმნა (ჯერ JSON-დან, თუ არა და საიტის HTML-დან)
        let rawColor = "";
        if (carJson && carJson.color) {
            rawColor = carJson.color.trim();
        } else {
            document.querySelectorAll('.param-item-label').forEach(label => {
                if (label.innerText.includes('车身颜色') || label.innerText.includes('颜色')) {
                    rawColor = label.closest('.param-item').querySelector('.param-item-value').innerText.trim();
                }
            });
        }

        if (rawColor) {
            for (let key in colorMap) {
                if (rawColor.includes(key)) {
                    carData.color = colorMap[key];
                    break;
                }
            }
        }

        // 🎯 ცილინდრების ამოღება DOM-დან
        const configSpans = document.querySelectorAll('.config-table-value');
        configSpans.forEach(span => {
            let parentRow = span.closest('.config-row');
            if (parentRow) {
                let text = parentRow.innerText.toLowerCase();
                if (text.includes('气缸数') || text.includes('number of cylinders') || text.includes('cylinders')) {
                    let cyl = span.innerText.replace(/[^0-9]/g, '');
                    if (cyl) carData.cylinders = cyl;
                }
            }
        });

        // ფოტოების Fallback 
        if (carData.photos.length === 0) {
            let photoUrls = [];
            document.querySelectorAll('img').forEach(img => {
                let src = img.src;
                if (src && src.includes('guazistatic.com') && src.includes('.jpg')) {
                    photoUrls.push(src.split('?')[0]);
                }
            });
            carData.photos = [...new Set(photoUrls)];
        }

        // 🎯 VIN HUNTER
        let bodyText = document.body.innerText;
        let vinMatch = bodyText.match(/\b[A-HJ-NPR-Z0-9]{17}\b/i);
        if (vinMatch) {
            carData.vin = vinMatch[0].toUpperCase();
        }

        chrome.storage.local.set({ "savedCar": carData }, () => {
            alert(
                `✅ SIGNAL: Guazi.com მზადაა!\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `მარკა/მოდელი: ${carData.make} ${carData.model}\n` +
                `VIN კოდი: ${carData.vin}\n` +
                `ფერი: ${carData.color}\n` +
                `ძრავა: ${carData.engine} (ცილინდრი: ${carData.cylinders})\n` +
                `გარბენი: ${carData.mileage} km\n` +
                `ფოტოები: ${carData.photos.length} ცალი (HD)`
            );
        });

    } catch (e) { 
        console.error(e);
        alert("Guazi სკანირების შეცდომა!"); 
    }
}
// --- SIGNAL - IAAI/Synetiq Scraper (V1.2 - Title Parser Fix) ---

function scrapeIaaiData() {
    let carData = { 
        vin: "---", mileage: "", engine: "", make: "", model: "", year: "", 
        fuel: "", category: "სედანი", cylinders: "6", transmission: "", drive: "awd", 
        color: "", interior: "", photos: [], steering: "right", unit: "miles"
    };

    try {
        // 1. მწარმოებლის, მოდელის და წლის ამოღება სათაურიდან (შენი მოწოდებული div-ის მიხედვით)
        const titleEl = document.querySelector('.details-title');
        if (titleEl) {
            const fullTitle = titleEl.innerText.trim(); // მაგ: "2015 BMW X1 XDRIVE20D..."
            const yearMatch = fullTitle.match(/^(\d{4})/); // ეძებს პირველ 4 ციფრს (წელს)

            if (yearMatch) {
                carData.year = yearMatch[1];
                let remaining = fullTitle.replace(carData.year, "").trim(); // აშორებს წელს
                
                // მულტი-სიტყვიანი მარკების შემოწმება (მაგ: LAND ROVER)
                if (remaining.toUpperCase().startsWith("LAND ROVER")) {
                    carData.make = "LAND ROVER";
                } else {
                    carData.make = remaining.split(" ")[0]; // იღებს პირველ სიტყვას როგორც მარკას
                }
                
                // მოდელის ამოჭრა (მარკის შემდეგ და ტექნიკურ მონაცემებამდე)
                let modelPart = remaining.replace(carData.make, "").trim();
                // ვჭრით იქ, სადაც იწყება ძრავის მოცულობა (მაგ: 1995cc)
                carData.model = modelPart.split(/\d{4}cc/i)[0].split(/\d{3}cc/i)[0].trim();
            }
        }

        // 2. დანარჩენი ტექნიკური მონაცემები ცხრილიდან
        const allItems = Array.from(document.querySelectorAll('.list-group-item'));
        const findVal = (label) => {
            const item = allItems.find(el => el.innerText.includes(label));
            return item ? item.querySelector('.list-group-text-item, .list-group-item-text')?.innerText.trim() : "";
        };

        carData.mileage = findVal('Odometer').replace(/[^\d]/g, ''); // [cite: 127, 128, 129]
        carData.color = findVal('Color').toLowerCase();
        carData.transmission = findVal('Gearbox').toLowerCase(); // [cite: 126]
        
        let engRaw = findVal('Engine'); 
        let engMatch = engRaw.match(/(\d+)/);
        if (engMatch) {
            carData.engine = (parseInt(engMatch[1]) / 1000).toFixed(1);
        }

        if (engRaw.toLowerCase().includes('diesel')) carData.fuel = "diesel";
        else carData.fuel = "petrol";

        // 3. ფოტოების ამოღება HD გალერეიდან
        if (typeof gallery !== 'undefined' && gallery.length > 0) {
            carData.photos = gallery.map(img => img.src); // [cite: 79]
        } else {
            const imgs = document.querySelectorAll('.preload img');
            carData.photos = Array.from(imgs).map(i => i.getAttribute('data-post-load') || i.src).filter(s => s && s.includes('http'));
        }

        chrome.storage.local.set({ "savedCar": carData }, () => {
            alert(`✅ SIGNAL (Fix): მონაცემები მზადაა!\nმარკა: ${carData.make}\nმოდელი: ${carData.model}\nწელი: ${carData.year}`);
        });

    } catch (e) {
        console.error(e);
        alert("შეცდომა სკანირებისას!");
    }
}
// --- SIGNAL - IAAI USA Scraper (Standalone - Photo Fix) ---

function scrapeIaaiUsaData() {
    console.log("SIGNAL: იწყება ამერიკული IAAI-ს სკანირება...");
    
    let carData = { 
        vin: "---", mileage: "", engine: "", make: "", model: "", year: "", 
        fuel: "petrol", category: "სედანი", cylinders: "6", transmission: "", 
        drive: "awd", color: "", interior: "", photos: [], steering: "left", unit: "miles"
    };

    try {
        // 1. სათაურიდან წლის, მარკის და მოდელის ამოღება
        const titleEl = document.getElementById('TitleSection');
        if (titleEl) {
            const titleText = titleEl.innerText.trim();
            const yearMatch = titleText.match(/^(\d{4})/);
            if (yearMatch) {
                carData.year = yearMatch[1];
                let remaining = titleText.replace(carData.year, "").trim();
                let parts = remaining.split(" ");
                carData.make = parts[0];
                carData.model = remaining.replace(carData.make, "").split("for Auction")[0].trim();
            }
        }

        // 2. მონაცემების ამოღება ცხრილიდან (.data-list__item)
        const findVal = (label) => {
            const items = Array.from(document.querySelectorAll('.data-list__item'));
            const found = items.find(i => i.querySelector('span')?.innerText.includes(label));
            return found ? found.querySelector('.data-list__value')?.innerText.trim() : "";
        };

        carData.vin = findVal('VIN:').split(" ")[0] || "---";
        carData.mileage = findVal('Odometer:').replace(/[^\d]/g, '');
        carData.color = findVal('Exterior:').toLowerCase();
        carData.transmission = findVal('Transmission:').toLowerCase();
        carData.engine = findVal('Engine:').match(/(\d+\.\d+)/)?.[0] || "";
        
        const driveRaw = findVal('Drive Line Type:').toLowerCase();
        if (driveRaw.includes('all') || driveRaw.includes('4')) carData.drive = "awd";
        else if (driveRaw.includes('front')) carData.drive = "fwd";
        else carData.drive = "rwd";

        // --- 3. ფოტოების ამოღების ახალი, გაძლიერებული ლოგიკა ---
        const allImages = Array.from(document.querySelectorAll('img'));
        let collectedPhotos = [];

        allImages.forEach(img => {
            // ვამოწმებთ ყველა შესაძლო ატრიბუტს, სადაც IAAI ინახავს სურათის ლინკს
            let src = img.getAttribute('data-src') || img.getAttribute('data-full') || img.src;

            if (src && src.includes('http') && !src.includes('spacer.gif') && !src.includes('placeholder')) {
                // IAAI-ს მანქანის ფოტოებს ჩვეულებრივ აქვთ "iaai.com", "vehicledata" ან "vis" ლინკში
                if (src.includes('iaai.com') || src.includes('vehicledata') || src.includes('vis')) {
                    // ვასწორებთ ლინკის ფორმატს, თუ საჭიროა
                    if (src.startsWith('//')) src = 'https:' + src;
                    collectedPhotos.push(src);
                }
            }
        });

        // დუბლიკატების მოცილება და შენახვა
        carData.photos = [...new Set(collectedPhotos)];

        // 4. შენახვა და შეტყობინება
        chrome.storage.local.set({ "savedCar": carData }, () => {
            alert(`✅ SIGNAL USA: მონაცემები მზადაა!\nVIN: ${carData.vin}\nმანქანა: ${carData.make} ${carData.model}\nფოტოები: ${carData.photos.length} ცალი`);
        });

    } catch (e) {
        console.error("SIGNAL USA Error:", e);
        alert("შეცდომა ამერიკული საიტის სკანირებისას!");
    }
}
// --- MANHEIM სკანერი (V7.1 - Smart Category Fix) ---

function scrapeManheimData() {
    let carData = { vin: "", mileage: "", engine: "", make: "", model: "", year: "", fuel: "petrol", category: "", cylinders: "", transmission: "", drive: "", color: "", interior: "", photos: [], featuresList: [], steering: "left", unit: "km" };
    try {
        const findVal = (labels) => {
            const detailsDivs = Array.from(document.querySelectorAll('.details-content'));
            for (let label of labels) {
                const targetDiv = detailsDivs.find(d => d.querySelector('strong')?.innerText.trim().toLowerCase().replace(':', '') === label.toLowerCase());
                if (targetDiv) {
                    let val = targetDiv.querySelector('span')?.innerText.trim();
                    if (val && val.toLowerCase() !== 'any') return val;
                }
            }
            const all = Array.from(document.querySelectorAll('.key-details-font-header, strong, span, td, th'));
            for (let label of labels) {
                const header = all.find(el => el.innerText && el.innerText.trim().toLowerCase().replace(':', '') === label.toLowerCase());
                if (header) {
                    let val = (header.nextElementSibling?.innerText || header.parentElement?.innerText.replace(header.innerText, "")).trim();
                    if (val && val.toLowerCase() !== 'any') return val;
                }
            }
            return "";
        };

        carData.vin = findVal(['VIN', 'VIN No', 'VIN:']);
        carData.mileage = findVal(['Odometer', 'Mileage']).replace(/[^\d]/g, '');
        
        let engineRaw = findVal(['Engine']);
        if (engineRaw.toLowerCase().includes('cyl')) {
            let cylMatch = engineRaw.match(/(\d+)\s*Cyl/i);
            carData.cylinders = cylMatch ? cylMatch[1] : "";
            let volMatch = engineRaw.match(/(\d+\.\d+)/);
            carData.engine = volMatch ? volMatch[1] : engineRaw.replace(/[^0-9.]/g, '');
        } else {
            carData.engine = engineRaw.split(' ')[0].replace(/[^0-9.]/g, '');
        }

        let lowEng = engineRaw.toLowerCase();
        if (lowEng.includes('hybrid')) carData.fuel = "hybrid";
        else if (lowEng.includes('diesel')) carData.fuel = "diesel";
        else if (lowEng.includes('electric')) carData.fuel = "electric";
        else carData.fuel = "petrol";

        carData.transmission = findVal(['Transmission']).toLowerCase();
        carData.drive = findVal(['Drive Type']).toLowerCase();
        carData.make = findVal(['Make']);
        carData.model = findVal(['Model']);
        carData.color = findVal(['Body Colour', 'Colour', 'Exterior Color']).toLowerCase();
        
        const steeringRaw = findVal(['Steering', 'Drive Side', 'Hand Drive']).toLowerCase();
        carData.steering = (steeringRaw.includes('right') || window.location.href.includes('.com.au')) ? 'right' : 'left';

        carData.interior = findVal(['Trim', 'Interior', 'Interior Color']).toLowerCase();
        if (!carData.cylinders) carData.cylinders = findVal(['Cylinders']).replace(/[^\d]/g, '');
        
        // 🚨 ფიქსი: ვიღებთ სუფთა ტექსტს კატეგორიიდან, ყოველგვარი შეზღუდვის გარეშე
        carData.category = findVal(['Body Type', 'Body Style']).toLowerCase();

        const title = document.querySelector('.vdp-heading, h1, .vehicle-title')?.innerText.trim() || "";
        const parts = title.split(' ');
        if (parts.length > 0) { carData.year = parts[0].replace(/[^\d]/g, ''); }

        carData.photos = Array.from(document.querySelectorAll('.image-carousel img, .vdp-image-viewer img, .gallery-img, .image-container img, .gallery-img img'))
            .map(img => img.getAttribute('data-src') || img.src)
            .filter(src => src && src.includes('http'));

        chrome.storage.local.set({ "savedCar": carData }, () => {
            alert(`✅ მანჰეიმი მზადაა!\nკატეგორია: ${carData.category}`);
        });
    } catch (e) { console.error(e); }
}
// --- MANHEIM USA სკანერი ---

function scrapeManheimUsaData() {
    let carData = { vin: "", mileage: "", engine: "", make: "", model: "", year: "", fuel: "petrol", category: "", cylinders: "", transmission: "", drive: "", color: "", interior: "", photos: [], featuresList: [], steering: "left", unit: "mi" };
    try {
        const findVal = (labels) => {
            const detailsDivs = Array.from(document.querySelectorAll('.details-content'));
            for (let label of labels) {
                const targetDiv = detailsDivs.find(d => d.querySelector('strong')?.innerText.trim().toLowerCase().replace(':', '') === label.toLowerCase());
                if (targetDiv) {
                    let val = targetDiv.querySelector('span')?.innerText.trim();
                    if (val && val.toLowerCase() !== 'any') return val;
                }
            }
            const all = Array.from(document.querySelectorAll('.key-details-font-header, strong, span, td, th, div'));
            for (let label of labels) {
                const header = all.find(el => el.innerText && el.innerText.trim().toLowerCase().replace(':', '') === label.toLowerCase());
                if (header) {
                    let val = (header.nextElementSibling?.innerText || header.parentElement?.innerText.replace(header.innerText, "")).trim();
                    if (val && val.toLowerCase() !== 'any') return val;
                }
            }
            return "";
        };

        // 1. VIN-ის ამოღება
        const vinEl = document.querySelector('[data-test-id="vin"]');
        const urlMatch = window.location.href.match(/details\/([A-Z0-9]{17})/i);
        if (vinEl) {
            carData.vin = vinEl.textContent.trim();
        } else if (urlMatch && urlMatch[1]) {
            carData.vin = urlMatch[1];
        } else {
            carData.vin = findVal(['VIN', 'VIN No', 'VIN:']);
        }

        // 2. გარბენი (Odometer)
        const odometerEl = document.querySelector('[data-test-id="odometer"]');
        if (odometerEl) {
            carData.mileage = odometerEl.textContent.replace(/[^\d]/g, '');
        } else {
            carData.mileage = findVal(['Odometer', 'Mileage', 'Miles']).replace(/[^\d]/g, '');
        }
        
        // 3. ძრავა და ცილინდრები
        const engineDispEl = document.querySelector('[data-test-id="engine-displacement"]');
        const engineTypeEl = document.querySelector('[data-test-id="engine-type"]');
        
        if (engineDispEl || engineTypeEl) {
            carData.engine = engineDispEl ? engineDispEl.textContent.replace(/[^0-9.]/g, '') : "";
            let typeTxt = engineTypeEl ? engineTypeEl.textContent : "";
            let cylMatch = typeTxt.match(/(\d+)\s*Cyl/i);
            carData.cylinders = cylMatch ? cylMatch[1] : "";
            if(!carData.engine && typeTxt.match(/(\d+\.\d+)/)) {
                 carData.engine = typeTxt.match(/(\d+\.\d+)/)[1];
            }
        } else {
            let engineRaw = findVal(['Engine', 'Displacement']);
            if (engineRaw.toLowerCase().includes('cyl')) {
                let cylMatch = engineRaw.match(/(\d+)\s*Cyl/i);
                carData.cylinders = cylMatch ? cylMatch[1] : "";
                let volMatch = engineRaw.match(/(\d+\.\d+)/);
                carData.engine = volMatch ? volMatch[1] : engineRaw.replace(/[^0-9.]/g, '');
            } else {
                carData.engine = engineRaw.split(' ')[0].replace(/[^0-9.]/g, '');
            }
        }

        // 4. საწვავი
        const fuelEl = document.querySelector('[data-test-id="engine-fuel-type"]');
        let lowEng = fuelEl ? fuelEl.textContent.toLowerCase() : findVal(['Engine', 'Displacement', 'Fuel']).toLowerCase();
        if (lowEng.includes('hybrid')) carData.fuel = "hybrid";
        else if (lowEng.includes('diesel')) carData.fuel = "diesel";
        else if (lowEng.includes('electric')) carData.fuel = "electric";
        else carData.fuel = "petrol";

        // 5. ტრანსმისია და წამყვანი თვლები
        const transEl = document.querySelector('[data-test-id="transmission"]');
        carData.transmission = transEl ? transEl.textContent.toLowerCase().replace('•', '').trim() : findVal(['Transmission', 'Trans']).toLowerCase();
        
        const driveEl = document.querySelector('[data-test-id="drive-train"]');
        carData.drive = driveEl ? driveEl.textContent.toLowerCase().replace('•', '').trim() : findVal(['Drive Type', 'Drive', 'Drivetrain']).toLowerCase();

        // 6. ფერები და ინტერიერი
        carData.color = findVal(['Exterior Color', 'Body Colour', 'Colour', 'Color']).toLowerCase();
        const interiorEl = document.querySelector('[data-test-id="interior-type"]');
        carData.interior = interiorEl ? interiorEl.textContent.toLowerCase().replace('•', '').trim() : findVal(['Interior Color', 'Trim', 'Interior']).toLowerCase();
        
        carData.steering = 'left'; 
        carData.category = findVal(['Body Style', 'Body Type', 'Body']).toLowerCase();

        // 7. წელი, მწარმოებელი, მოდელი (Listing Title-დან)
        const titleEl = document.querySelector('[data-test-id="listing-title"]');
        let title = "";
        if (titleEl) {
            title = titleEl.textContent.trim(); 
        } else {
            title = document.querySelector('.vdp-heading, h1, .vehicle-title')?.innerText.trim() || "";
        }

        if (title) {
            const parts = title.split(' ');
            if (parts.length > 0) carData.year = parts[0].replace(/[^\d]/g, '');
            if (parts.length > 1) carData.make = parts[1];
            if (parts.length > 2) carData.model = parts.slice(2).join(' ');
        } else {
            carData.make = findVal(['Make']);
            carData.model = findVal(['Model']);
        }

        // 8. ფოტოები (განახლებული ლოგიკა Fyusion პლეერისთვის)
        let rawPhotos = Array.from(document.querySelectorAll('#fyusion-prism-viewer img, .svfy_scroller img, .image-carousel img, .vdp-image-viewer img, .gallery-img, .image-container img, .gallery-img img, .carousel img, .slide img'))
            .map(img => img.getAttribute('data-src') || img.src)
            .filter(src => src && src.includes('http') && !src.includes('icon') && !src.includes('logo') && !src.includes('spinner'));

        // ვფილტრავთ დუბლიკატებს და ვიღებთ HD ფოტოებს (_thumb-ის ამოშლით)
        let uniquePhotos = [];
        rawPhotos.forEach(src => {
            let cleanSrc = src.replace('_thumb', '');
            if (!uniquePhotos.includes(cleanSrc)) {
                uniquePhotos.push(cleanSrc);
            }
        });
        carData.photos = uniquePhotos;

        chrome.storage.local.set({ "savedCar": carData }, () => {
            alert(`✅ Manheim USA მზადაა!\nVIN: ${carData.vin}\nწელი: ${carData.year}\nმოდელი: ${carData.make} ${carData.model}\nფოტოები: ${carData.photos.length} ცალი`);
        });
    } catch (e) { console.error("Manheim USA Error:", e); }
}
// --- SIGNAL - Edge Pipeline Scraper (V1.1 - Precision Fix) ---

function scrapePipelineData() {
    let carData = { 
        vin: "---", mileage: "", engine: "", make: "", model: "", year: "", 
        fuel: "petrol", category: "ჯიპი", cylinders: "", transmission: "Automatic", drive: "", 
        color: "", interior: "", photos: [], steering: "left", unit: "miles", source: "pipeline"
    };

    try {
        // 🎯 1. მონაცემების ამოღება OG Title-დან (წელი, მარკა, მოდელი)
        const ogTitle = document.querySelector('meta[property="og:title"]')?.content || "";
        if (ogTitle) {
            const yearMatch = ogTitle.match(/\b(19|20)\d{2}\b/);
            if (yearMatch) carData.year = yearMatch[0];

            const cylMatch = ogTitle.match(/(\d+)cyl/i);
            if (cylMatch) carData.cylinders = cylMatch[1];

            if (ogTitle.toLowerCase().includes("gasoline")) carData.fuel = "petrol";
            else if (ogTitle.toLowerCase().includes("diesel")) carData.fuel = "diesel";

            const titleParts = ogTitle.split(' ');
            if (titleParts.length > 2) {
                carData.make = titleParts[1];
                carData.model = titleParts.slice(2, 4).join(' ');
            }
        }

        // 🎯 2. ფოტოები (Fotorama გალერეიდან)
        let photoUrls = [];
        document.querySelectorAll('.fotorama__img').forEach(img => {
            let src = img.src;
            if (src && src.includes('http')) photoUrls.push(src.split('?')[0]);
        });
        carData.photos = [...new Set(photoUrls)];

        // 🎯 3. დეტალური ინფორმაცია (ძრავა, გარბენი, VIN)
        // დამატებულია .odometer სელექტორი სპეციალურად გარბენისთვის
        const fields = Array.from(document.querySelectorAll('.field, .cell, .vdp-details__item, td, .odometer'));
        
        fields.forEach(el => {
            const labelText = el.querySelector('label')?.innerText || "";
            const valueText = el.querySelector('span')?.innerText || el.innerText;

            // ძრავის მოცულობის ამოღება (Displacement)
            if (labelText.includes('Displacement') || labelText.includes('Engine')) {
                carData.engine = valueText.trim();
            }
            
            // 🎯 გარბენის ამოღება (Odometer - Precision Fix)
            // ვამოწმებთ ან label-ის ტექსტს, ან თავად ელემენტის კლასს (odometer)
            if (labelText.includes('Odometer') || el.classList.contains('odometer')) {
                const val = valueText.replace(/[^0-9]/g, ''); // ამოიღებს მხოლოდ ციფრებს (მაგ: 140094)
                if (val) carData.mileage = val;
            }

            // VIN კოდის ძებნა
            const text = el.innerText.trim();
            if (text.match(/^[A-HJ-NPR-Z0-9]{17}$/i)) {
                carData.vin = text.toUpperCase();
            }
        });

        // დამატებითი შემოწმება VIN-ისთვის, თუ ზემოთ ვერ იპოვა
        if (carData.vin === "---") {
            const bodyVin = document.body.innerText.match(/[A-HJ-NPR-Z0-9]{17}/i);
            if (bodyVin) carData.vin = bodyVin[0].toUpperCase();
        }

        chrome.storage.local.set({ "savedCar": carData }, () => {
            alert(
                `✅ SIGNAL: Pipeline მზადაა!\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `ძრავა: ${carData.engine || "---"}\n` +
                `გარბენი: ${carData.mileage || "---"} miles\n` +
                `ფოტოები: ${carData.photos.length} ცალი`
            );
        });

    } catch (e) { 
        console.error(e);
        alert("Pipeline სკანირების შეცდომა!"); 
    }
}
// --- SIGNAL - MyAuto Injector (V9.6 - Dynamic Location Fix) ---

var MAPS = {
    wheel: { "left": "0", "right": "1" }, 
    gearbox: { "automatic": "2", "manual": "1", "tiptronic": "3" },
    fuel: { "petrol": "2", "diesel": "3", "hybrid": "6", "electric": "7", "gasoline": "2" },
    categoryIds: { "სედანი": "1", "ჯიპი": "2", "ჰეჩბექი": "3", "კუპე": "4", "კაბრიოლეტი": "5", "უნივერსალი": "6", "მინივენი": "7", "პიკაპი": "8" },
    categoryMap: { 
        "suv": "ჯიპი", "utility": "ჯიპი", "crossover": "ჯიპი",
        "coupe": "კუპე", "coupé": "კუპე",
        "cabriolet": "კაბრიოლეტი", "convertible": "კაბრიოლეტი",
        "hatchback": "ჰეჩბექი", "liftback": "ჰეჩბექი",
        "wagon": "უნივერსალი", "estate": "უნივერსალი",
        "minivan": "მინივენი", "van": "მინივენი",
        "pickup": "პიკაპი", "truck": "პიკაპი",
        "sedan": "სედანი", "saloon": "სედანი"
    },
    colors: { "white": "1", "black": "3", "silver": "12", "gray": "2", "blue": "4", "red": "5", "orange": "6", "yellow": "7", "brown": "10", "gold": "11" },
    saloonColors: { "black": "16", "beige": "1", "gray": "14", "tan": "1", "brown": "2" }
};

window.injectDataToMyAuto = async function() {
    chrome.storage.local.get("savedCar", async (data) => {
        if (!data || !data.savedCar) return alert("ცარიელია!");
        const car = data.savedCar;
        const deepClick = (el) => { if (!el) return; ['mouseover', 'mousedown', 'mouseup', 'click'].forEach(evt => el.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true, view: window }))); };
        const fClick = (tid) => { const el = document.querySelector(`[data-testid="${tid}"]`); if (el) { deepClick(el); el.click(); } };

        const smartSelect = async (testId, searchText) => {
            if (!searchText || searchText === '---') return;
            const trigger = document.querySelector(`[data-testid="single-select-trigger-${testId}"]`);
            if (trigger) { deepClick(trigger); await new Promise(r => setTimeout(r, 400)); }
            const input = document.querySelector(`input[data-testid="single-select-search-${testId}"]`);
            if (!input) return;
            input.focus(); input.click(); await new Promise(r => setTimeout(r, 600));
            input.value = searchText; input.dispatchEvent(new Event('input', { bubbles: true }));
            await new Promise(r => setTimeout(r, 1500));
            const options = Array.from(document.querySelectorAll(`div[data-testid*="option-${testId}"]`));
            let target = options.find(el => el.innerText.trim().toLowerCase() === searchText.toLowerCase().trim()) || options.find(el => el.innerText.trim().toLowerCase().includes(searchText.toLowerCase().trim()));
            if (target) { deepClick(target); input.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(r => setTimeout(r, 600)); }
        };

        // 1. VIN, გარბენი, მილები
        const vinF = document.querySelector('input[name="primaryFeatures.vinCode"]');
        if (vinF && car.vin !== "---") { vinF.value = car.vin; vinF.dispatchEvent(new Event('input', { bubbles: true })); }
        const milF = document.querySelector('input[name="primaryFeatures.mileage"]');
        if (milF) { milF.value = car.mileage; milF.dispatchEvent(new Event('input', { bubbles: true })); }
        if (car.unit === "miles" || car.unit === "mi") { const trig = document.querySelector('[data-testid="single-select-trigger-primaryFeatures.mileageType"]'); if (trig) { deepClick(trig); await new Promise(r => setTimeout(r, 600)); fClick('single-select-option-primaryFeatures.mileageType-2'); } }

        // 2. მარკა, მოდელი, წელი, ძრავა
        await smartSelect("primaryFeatures.manufacturer", car.make);
        await smartSelect("primaryFeatures.model", car.model);
        await smartSelect("primaryFeatures.issueYear", car.year);
        await smartSelect("primaryFeatures.engineVolume", car.engine);

        // საწვავი და ცილინდრები
        const fuelId = MAPS.fuel[car.fuel?.toLowerCase()] || "2";
        const fTrig = document.querySelector('[data-testid="single-select-trigger-primaryFeatures.fuelType"]');
        if (fTrig) { deepClick(fTrig); await new Promise(r => setTimeout(r, 600)); const opt = document.querySelector(`[data-testid="single-select-option-primaryFeatures.fuelType-${fuelId}"]`); if (opt) deepClick(opt); }
        if (car.cylinders) { const cTrig = document.querySelector('[data-testid="single-select-trigger-primaryFeatures.cylinders"]'); if (cTrig) { deepClick(cTrig); await new Promise(r => setTimeout(r, 600)); const opt = document.querySelector(`[data-testid="single-select-option-primaryFeatures.cylinders-${car.cylinders}"]`); if (opt) deepClick(opt); } }
        
        // 3. კატეგორია
        let geoCat = "სედანი"; 
        const rawCat = (car.category || "").toLowerCase();
        for (let key in MAPS.categoryMap) { if (rawCat.includes(key)) { geoCat = MAPS.categoryMap[key]; break; } }
        const catId = MAPS.categoryIds[geoCat] || "1";
        const catTrigger = document.querySelector('[data-testid="single-select-trigger-primaryFeatures.vehicleCategory"]');
        if (catTrigger) { deepClick(catTrigger); await new Promise(r => setTimeout(r, 800)); const catOption = document.querySelector(`[data-testid="single-select-option-primaryFeatures.vehicleCategory-${catId}"]`); if (catOption) deepClick(catOption); }

        // 4. 🎯 მდებარეობის დინამიური არჩევა
        const locTrig = document.querySelector('[data-testid="single-select-trigger-location.location"]');
        if (locTrig) { 
            deepClick(locTrig); 
            await new Promise(r => setTimeout(r, 800)); 
            
            // თუ წყარო Encar-ია, ირჩევს იაპონიას (22), წინააღმდეგ შემთხვევაში - აშშ (21)
            const locId = car.source === "encar" ? "22" : "21";
            fClick(`single-select-child-option-location.location-${locId}`); 
        }

        // 5. სხვა ღილაკები
        await new Promise(r => setTimeout(r, 500));
        fClick(`single-checkbox-primaryFeatures.wheelTypeId-${car.steering === "right" ? "1" : "0"}`);
        fClick(`single-checkbox-primaryFeatures.gearTypeId-${(car.transmission || "").toLowerCase().includes('auto') ? "2" : "1"}`);
        fClick(`single-checkbox-primaryFeatures.airbags-12`);

        let doorId = "2"; if ((rawCat.includes('coupe') || rawCat.includes('cabriolet')) && !rawCat.includes('5d')) { doorId = "1"; }
        fClick(`single-checkbox-primaryFeatures.doorTypeId-${doorId}`);

        let driveId = "3"; const dRaw = (car.drive || "").toLowerCase();
        if (dRaw.includes('front') || dRaw.includes('fwd')) driveId = "1";
        else if (dRaw.includes('rear') || dRaw.includes('rwd')) driveId = "2";
        else if (dRaw.includes('all') || dRaw.includes('4') || dRaw.includes('awd')) driveId = "3";
        fClick(`single-checkbox-primaryFeatures.driveTypeId-${driveId}`);

        // 6. ფერები
        let vColId = "3"; for (let key in MAPS.colors) { if ((car.color || "").toLowerCase().includes(key)) { vColId = MAPS.colors[key]; break; } }
        fClick(`single-checkbox-primaryFeatures.vehicleColorId-${vColId}`);
        const intLow = (car.interior || "").toLowerCase();
        fClick(`single-checkbox-primaryFeatures.saloonMaterialId-${intLow.includes('leather') ? "1" : "2"}`);
        let sColId = "16"; for (let key in MAPS.saloonColors) { if (intLow.includes(key)) { sColId = MAPS.saloonColors[key]; break; } }
        fClick(`single-checkbox-primaryFeatures.saloonColorId-${sColId}`);

        // 7. ფოტოები (CSP ფიქსით)
        if (car.photos && car.photos.length > 0) {
            const container = new DataTransfer();
            for (let i = 0; i < Math.min(car.photos.length, 12); i++) {
                try {
                    const res = await chrome.runtime.sendMessage({ action: "get_image_blob", url: car.photos[i] });
                    if (res?.dataUrl) {
                        const parts = res.dataUrl.split(',');
                        const mime = parts[0].match(/:(.*?);/)[1];
                        const bstr = atob(parts[1]);
                        let n = bstr.length, u8arr = new Uint8Array(n);
                        while(n--) { u8arr[n] = bstr.charCodeAt(n); }
                        const blob = new Blob([u8arr], {type:mime});
                        container.items.add(new File([blob], `p_${i}.jpg`, { type: "image/jpeg" }));
                    }
                } catch (e) {}
            }
            const fInput = document.querySelector('input[type="file"][multiple]');
            if (fInput) { fInput.files = container.files; fInput.dispatchEvent(new Event('change', { bubbles: true })); }
        }

        const today = new Date().toLocaleDateString('en-CA');
        chrome.storage.local.get(['carsToday', 'lastResetDate'], (res) => {
            let count = (res.lastResetDate === today) ? (res.carsToday || 0) + 1 : 1;
            chrome.storage.local.set({ 'carsToday': count, 'lastResetDate': today });
        });

        alert("მზადაა! 🥂");
    });
};
// ══════════════════════════════════════════════════════
// ROUTER — საიტის ამოცნობა და სათანადო სკრაპერის გაშვება
// ══════════════════════════════════════════════════════

function ensureTransferButton() {
    if (!window.location.href.includes("myauto.ge")) return;
    if (document.getElementById("helper-box")) return;
    const box = document.createElement("div");
    box.id = "helper-box";
    box.style = "position:fixed;top:100px;right:20px;z-index:999999;";
    const btn = document.createElement("button");
    btn.innerHTML = "🚀 გადატანა";
    btn.style = "padding:15px;background:#27ae60;color:white;font-weight:bold;border-radius:8px;cursor:pointer;border:2px solid #fff;box-shadow:0 4px 15px rgba(0,0,0,0.2);";
    btn.onclick = () => { if (typeof window.injectDataToMyAuto === "function") window.injectDataToMyAuto(); else alert("ინჟექტორი ვერ მოიძებნა!"); };
    box.appendChild(btn);
    document.body.appendChild(box);
}

var _url = window.location.href.toLowerCase();

if (_url.includes("myauto.ge")) {
    ensureTransferButton();
    setInterval(ensureTransferButton, 2000);
} else if (_url.includes("edgepipeline.com"))  { scrapePipelineData(); }
else if (_url.includes("encar.com"))            { scrapeEncarData(); }
else if (_url.includes("cars.com"))             { scrapeCarsData(); }
else if (_url.includes("copart.de"))            { scrapeCopartDeData(); }
else if (_url.includes("manheim.com.au"))       { scrapeManheimData(); }
else if (_url.includes("manheim.com"))          { scrapeManheimUsaData(); }
else if (_url.includes("copart.com"))           { scrapeCopartData(); }
else if (_url.includes("iaai.co.uk"))           { scrapeIaaiData(); }
else if (_url.includes("iaai.com"))             { scrapeIaaiUsaData(); }
else if (_url.includes("guazi.com"))            { scrapeGuaziData(); }
else { alert("SIGNAL: ეს საიტი არ არის მხარდაჭერილი.\n\nმხარდაჭერილი: encar.com, copart.com, copart.de, iaai.com, iaai.co.uk, manheim.com, cars.com, edgepipeline.com, guazi.com, myauto.ge"); }

})();
