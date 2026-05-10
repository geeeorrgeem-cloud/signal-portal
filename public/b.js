 ─── SIGNAL Bookmarklet Script ──────────────────────────────────────────────
 Loads on any supported site. Detects URL, runs correct scraper or injector.
 All chrome.storage.local  chrome.runtime calls replaced by Worker API.

(function () {
  'use strict';

   ── 1. Token & base URL from this script's src ─────────────────────────────
  var scriptEl = Array.from(document.querySelectorAll('script[src=b.js]')).pop();
  if (!scriptEl) {
     fallback last script tag
    scriptEl = document.scripts[document.scripts.length - 1];
  }
  var scriptUrl  = new URL(scriptEl.src);
  var SIGNAL_TOKEN = scriptUrl.searchParams.get('t');
  var SIGNAL_BASE  = scriptUrl.origin;   e.g. httpssignal-xyz.pages.dev

  if (!SIGNAL_TOKEN) {
    alert('⚠️ SIGNAL ტოკენი ვერ მოიძებნა!nnდაბრუნდით ' + SIGNAL_BASE + '-ზე, შეხვიდეთ სისტემაში და ბუქმარქლეტი ხელახლა გადმოიტანეთ.');
    return;
  }

   ── 2. SIGNAL API helpers (replace chrome.storage  chrome.runtime) ─────────
  var SIGNAL = {
    saveData async function (carData) {
      try {
        var r = await fetch(SIGNAL_BASE + 'apicarsave', {
          method 'POST',
          headers { 'Content-Type' 'applicationjson' },
          body JSON.stringify({ token SIGNAL_TOKEN, car carData })
        });
        return await r.json();
      } catch (e) { return { error e.message }; }
    },
    getData async function () {
      try {
        var r = await fetch(SIGNAL_BASE + 'apicargettoken=' + encodeURIComponent(SIGNAL_TOKEN));
        return await r.json();
      } catch (e) { return { car null }; }
    },
    getImage async function (imgUrl) {
      try {
        var r = await fetch(SIGNAL_BASE + 'apiimageurl=' + encodeURIComponent(imgUrl) + '&token=' + encodeURIComponent(SIGNAL_TOKEN));
        if (!r.ok) return null;
        return await r.json();  { dataUrl 'dataimagejpeg;base64,...' }
      } catch (e) { return null; }
    }
  };

   ── 3. MAPS (identical to extension content_main.js) ────────────────────────
  var MAPS = {
    wheel { 'left' '0', 'right' '1' },
    gearbox { 'automatic' '2', 'manual' '1', 'tiptronic' '3' },
    fuel { 'petrol' '2', 'diesel' '3', 'hybrid' '6', 'electric' '7', 'gasoline' '2' },
    categoryIds { 'სედანი' '1', 'ჯიპი' '2', 'ჰეჩბექი' '3', 'კუპე' '4', 'კაბრიოლეტი' '5', 'უნივერსალი' '6', 'მინივენი' '7', 'პიკაპი' '8' },
    categoryMap {
      'suv' 'ჯიპი', 'utility' 'ჯიპი', 'crossover' 'ჯიპი',
      'coupe' 'კუპე', 'coupé' 'კუპე',
      'cabriolet' 'კაბრიოლეტი', 'convertible' 'კაბრიოლეტი',
      'hatchback' 'ჰეჩბექი', 'liftback' 'ჰეჩბექი',
      'wagon' 'უნივერსალი', 'estate' 'უნივერსალი',
      'minivan' 'მინივენი', 'van' 'მინივენი',
      'pickup' 'პიკაპი', 'truck' 'პიკაპი',
      'sedan' 'სედანი', 'saloon' 'სედანი'
    },
    colors {
      'white' '1', 'თეთრი' '1', '白色' '1', '白' '1',
      'black' '3', 'შავი' '3', '黑色' '3', '黑' '3',
      'silver' '12', 'ვერცხლისფერი' '12', '银色' '12', '银' '12',
      'gray' '2', 'ნაცრისფერი' '2', 'რუხი' '2', '灰色' '2', '灰' '2',
      'blue' '4', 'ლურჯი' '4', 'ცისფერი' '4', '蓝色' '4', '蓝' '4',
      'red' '5', 'წითელი' '5', '红色' '5', '红' '5',
      'orange' '6', 'ნარინჯისფერი' '6', '橙色' '6', '橙' '6',
      'yellow' '7', 'ყვითელი' '7', '黄色' '7', '黄' '7',
      'brown' '10', 'ყავისფერი' '10', '棕色' '10', '棕' '10',
      'gold' '11', 'ოქროსფერი' '11', '金色' '11', '金' '11',
      'green' '8', 'მწვანე' '8', '绿色' '8', '绿' '8'
    },
    saloonColors { 'black' '16', 'beige' '1', 'gray' '14', 'tan' '1', 'brown' '2' }
  };

   ════════════════════════════════════════════════════════════════════════════
   SCRAPERS (logic identical to extension, only save call replaced)
   ════════════════════════════════════════════════════════════════════════════

   ── ENCAR ─────────────────────────────────────────────────────────────────
  function scrapeEncarData() {
    var carData = {
      vin '---', mileage '', engine '', make '', model '', year '',
      fuel 'petrol', category 'სედანი', cylinders '4', transmission 'Automatic',
      drive 'წინ', color 'white', interior '', photos [], steering 'left',
      unit 'km', source 'encar', country 'იაპონია'
    };
    try {
      var scripts = Array.from(document.querySelectorAll('script'));
      var stateScript = scripts.find(function (s) { return s.innerText.includes('__PRELOADED_STATE__'); });
      if (stateScript) {
        var jsonText = stateScript.innerText.split('__PRELOADED_STATE__ = ')[1].split(';script')[0];
        var state = JSON.parse(jsonText);
        var carBase = state.cars && state.cars.base;
        if (carBase) {
          carData.make = (carBase.category && (carBase.category.manufacturerEnglishName  carBase.category.manufacturerName))  '';
          carData.model = (carBase.category && (carBase.category.modelGroupEnglishName  carBase.category.modelName))  '';
          if (carBase.carNumber) carData.vin = carBase.carNumber;
          if (carBase.category && carBase.category.yearMonth) carData.year = carBase.category.yearMonth.substring(0, 4);
          if (carBase.spec && carBase.spec.mileage) carData.mileage = carBase.spec.mileage.toString().replace([^0-9]g, '');
          var disp = carBase.spec && carBase.spec.displacement;
          if (disp) {
            carData.engine = (disp  1000).toFixed(1);
            if (disp  1100) carData.cylinders = '3';
            else if (disp  2600) carData.cylinders = '4';
            else if (disp  3900) carData.cylinders = '6';
            else carData.cylinders = '8';
          }
          var fuel = carBase.spec && carBase.spec.fuelName;
          if (fuel === '가솔린') carData.fuel = 'petrol';
          else if (fuel === '디젤') carData.fuel = 'diesel';
          else if (fuel && fuel.includes('하이브리드')) carData.fuel = 'hybrid';
          carData.transmission = (carBase.spec && carBase.spec.transmissionName) === '오토'  'Automatic'  'Manual';
          carData.color = (carBase.spec && carBase.spec.colorName)  'white';
          if (carBase.photos) {
            carBase.photos.forEach(function (p) {
              carData.photos.push(('httpsci.encar.comcarpicture' + p.path).split('')[0]);
            });
          }
        }
      }
      var photoUrls = carData.photos.slice();
      document.querySelectorAll('img, div.gallery_img, span.img').forEach(function (el) {
        var src = el.src  el.getAttribute('data-src')  el.style.backgroundImage;
        if (src && src.includes('encar.com') && src.includes('carpicture')) {
          var cleanUrl = src.replace(^url(['], '').replace(['])$, '').split('')[0];
          photoUrls.push(cleanUrl);
        }
      });
      var unique = [...new Set(photoUrls)].sort();
      carData.photos = unique.slice(0, 15);
      SIGNAL.saveData(carData).then(function () {
        alert('✅ SIGNAL Encar მზადაა!n━━━━━━━━━━━━━━━━━━━━nმოდელი ' + carData.make + ' ' + carData.model + 'nფოტოები ' + carData.photos.length + ' ცალი (დალაგებული)');
      });
    } catch (e) { console.error(e); alert('Encar სკანირების შეცდომა!'); }
  }

   ── COPART USA ────────────────────────────────────────────────────────────
  function scrapeCopartData() {
    var carData = {
      vin '---', mileage '', engine '', make '', model '', year '',
      fuel 'petrol', category 'სედანი', cylinders '4', transmission 'Automatic',
      drive 'წინ', color 'white', interior '', photos [], steering 'left',
      unit 'miles', source 'copart_usa', country 'აშშ'
    };
    try {
      var pageTitle = document.title  '';
      var cleanTitle = pageTitle.split(' for ')[0].split('  ')[0].trim();
      var titleParts = cleanTitle.split(' ');
      if (titleParts.length = 3) {
        carData.year = titleParts[0].replace([^0-9]g, '');
        carData.make = titleParts[1];
        carData.model = titleParts.slice(2).join(' ').trim();
      }
      var titleEngineMatch = cleanTitle.match((d+.d+)Li);
      if (titleEngineMatch) carData.engine = titleEngineMatch[1];
      var findValueByLabel = function (labelKeywords) {
        var elements = document.querySelectorAll('span, label, p, div');
        for (var el of elements) {
          var text = el.innerText  el.innerText.trim()  '';
          for (var keyword of labelKeywords) {
            if (text.toLowerCase() === keyword.toLowerCase()) {
              var next = el.nextElementSibling;
              if (next && next.innerText && next.innerText.trim().length  0 && next.innerText.trim().length  100) {
                return next.innerText.trim();
              }
              var parent = el.parentElement;
              if (parent) {
                var sibling = parent.nextElementSibling;
                if (sibling && sibling.innerText && sibling.innerText.trim().length  100) return sibling.innerText.trim();
              }
              break;
            }
          }
        }
        return '';
      };
      carData.vin = findValueByLabel(['VIN', 'VIN', 'Vin #'])  '---';
      var rawMil = findValueByLabel(['Odometer', 'Miles', 'Mileage']);
      carData.mileage = rawMil.replace([^0-9]g, '');
      var rawEngine = findValueByLabel(['Engine']);
      if (rawEngine) {
        var volMatch = rawEngine.match((d+.d+));
        if (volMatch) carData.engine = volMatch[1];
        var cylMatch = rawEngine.match((d+)s[Cc]yl);
        if (cylMatch) carData.cylinders = cylMatch[1];
        var lowEng = rawEngine.toLowerCase();
        if (lowEng.includes('hybrid')) carData.fuel = 'hybrid';
        else if (lowEng.includes('diesel')) carData.fuel = 'diesel';
        else if (lowEng.includes('electric')) carData.fuel = 'electric';
      }
      carData.color = findValueByLabel(['Color', 'Colour', 'Vehicle Color']).toLowerCase();
      carData.transmission = findValueByLabel(['Transmission']).toLowerCase();
      carData.drive = findValueByLabel(['Drive', 'Drive Type', 'Drivetrain']).toLowerCase();
      carData.category = findValueByLabel(['Body Style', 'Body Type']).toLowerCase();
      var photos = [];
      document.querySelectorAll('img').forEach(function (img) {
        var src = img.src  img.getAttribute('data-src')  '';
        if (src && (src.includes('copart.com')  src.includes('iaa.com')) && src.includes('http')) {
          src = src.replace(_s.jpg_t.jpg_hs.jpggi, '_f.jpg');
          photos.push(src);
        }
      });
      carData.photos = [...new Set(photos)].filter(function (u) { return !u.includes('logo'); });
      SIGNAL.saveData(carData).then(function () {
        alert('✅ SIGNAL Copart USA მზადაა!n' + carData.year + ' ' + carData.make + ' ' + carData.model + 'nVIN ' + carData.vin + 'nფოტოები ' + carData.photos.length + ' ცალი');
      });
    } catch (e) { console.error(e); alert('Copart USA სკანირების შეცდომა!'); }
  }

   ── COPART DE ─────────────────────────────────────────────────────────────
  function scrapeCopartDeData() {
    var carData = {
      vin '---', mileage '', engine '', make '', model '', year '',
      fuel 'petrol', category '', cylinders '', transmission '', drive '',
      color '', interior '', photos [], steering 'left', unit 'km'
    };
    var findVal = function (labels) {
      var elements = Array.from(document.querySelectorAll('label, .bold-text, .lot-details-information-label, span, th'));
      for (var label of labels) {
        var match = elements.find(function (el) {
          var txt = el.innerText.trim().replace('', '').toLowerCase();
          return txt === label.toLowerCase();
        });
        if (match) {
          var val = (match.nextElementSibling && match.nextElementSibling.innerText) 
                    (match.parentElement && match.parentElement.querySelector('.p-ml-2, .lot-details-information-value, .ui-cell-data') && match.parentElement.querySelector('.p-ml-2, .lot-details-information-value, .ui-cell-data').innerText);
          if (val && val.trim().length  100) return val.trim();
        }
      }
      return '';
    };
    var getTableVal = function (columnNames) {
      var tds = Array.from(document.querySelectorAll('td'));
      for (var name of columnNames) {
        var cell = tds.find(function (td) {
          var title = td.querySelector('.p-column-title') && td.querySelector('.p-column-title').innerText.trim().toLowerCase();
          return title && title.includes(name.toLowerCase());
        });
        if (cell) return (cell.querySelector('.ui-cell-data') && cell.querySelector('.ui-cell-data').innerText.trim())  '';
      }
      return '';
    };
    try {
      carData.make = findVal(['Hersteller', 'Manufacturer', 'Make']);
      carData.model = findVal(['Modell', 'Model']);
      carData.year = findVal(['Jahr', 'Year']);
      var rawVin = findVal(['FIN', 'VIN', 'Fahrgestellnummer', 'END']);
      carData.vin = (rawVin && !rawVin.includes('') && rawVin.length = 10)  rawVin  '---';
      var engineRaw = getTableVal(['Hubraum', 'Engine displacement'])  findVal(['Hubraum', 'Engine displacement']);
      if (engineRaw) { var ccm = parseInt(engineRaw.replace([^0-9]g, '')); if (!isNaN(ccm)) carData.engine = (ccm  1000).toFixed(1); }
      var cylRaw = getTableVal(['Zylinder', 'Number of cylinders'])  findVal(['Anzahl der Zylinder', 'Number of cylinders']);
      if (cylRaw) carData.cylinders = cylRaw.replace([^0-9]g, '');
      carData.transmission = findVal(['Getriebe', 'Transmission']);
      carData.color = findVal(['Fahrzeugfarbe', 'Vehicle color', 'Farbe']);
      carData.drive = findVal(['Antrieb', 'Drive']);
      carData.category = findVal(['Karosserieform', 'Body style']);
      var rawMil = findVal(['Kilometerstand', 'Mileage']);
      carData.mileage = rawMil  rawMil.replace([^0-9]g, '')  '';
      var rawFuel = findVal(['Kraftstoff', 'Fuel', 'Kraftstofftyp']).toLowerCase();
      carData.fuel = rawFuel.includes('diesel')  'diesel'  'petrol';
      var photoUrls = [];
      document.querySelectorAll('.print-image-item img, .p-galleria-img-thumbnail, #zoomImgElement').forEach(function (img) {
        var src = img.src  img.getAttribute('data-src');
        if (src && src.startsWith('http')) photoUrls.push(src.replace((_hrs_th_s_m_t).jpgg, '_ful.jpg'));
      });
      carData.photos = [...new Set(photoUrls)].filter(function (u) { return !u.includes('logo'); });
      SIGNAL.saveData(carData).then(function () {
        alert('✅ SIGNAL DE მზადაა!n━━━━━━━━━━━━━━━━━━━━n' + carData.year + ' ' + carData.make + ' ' + carData.model + 'nძრავა ' + carData.engine + 'L  ცილინდრი ' + carData.cylinders + 'nფოტოები ' + carData.photos.length + ' ცალი');
      });
    } catch (e) { console.error('Scrape Error', e); alert('შეცდომა სკანირებისას!'); }
  }

   ── MANHEIM UKAU ─────────────────────────────────────────────────────────
  function scrapeManheimData() {
    var carData = {
      vin '', mileage '', engine '', make '', model '', year '',
      fuel 'petrol', category '', cylinders '', transmission '', drive '',
      color '', interior '', photos [], featuresList [], steering 'left', unit 'km'
    };
    try {
      var findVal = function (labels) {
        var detailsDivs = Array.from(document.querySelectorAll('.details-content'));
        for (var label of labels) {
          var targetDiv = detailsDivs.find(function (d) {
            var s = d.querySelector('strong');
            return s && s.innerText.trim().toLowerCase().replace('', '') === label.toLowerCase();
          });
          if (targetDiv) {
            var s = targetDiv.querySelector('span');
            var val = s && s.innerText.trim();
            if (val && val.toLowerCase() !== 'any') return val;
          }
        }
        var all = Array.from(document.querySelectorAll('.key-details-font-header, strong, span, td, th'));
        for (var label of labels) {
          var header = all.find(function (el) { return el.innerText && el.innerText.trim().toLowerCase().replace('', '') === label.toLowerCase(); });
          if (header) {
            var val = ((header.nextElementSibling && header.nextElementSibling.innerText) 
                       (header.parentElement && header.parentElement.innerText.replace(header.innerText, ''))).trim();
            if (val && val.toLowerCase() !== 'any') return val;
          }
        }
        return '';
      };
      carData.vin = findVal(['VIN', 'VIN No', 'VIN']);
      carData.mileage = findVal(['Odometer', 'Mileage']).replace([^d]g, '');
      var engineRaw = findVal(['Engine']);
      if (engineRaw.toLowerCase().includes('cyl')) {
        var cylMatch = engineRaw.match((d+)sCyli);
        carData.cylinders = cylMatch  cylMatch[1]  '';
        var volMatch = engineRaw.match((d+.d+));
        carData.engine = volMatch  volMatch[1]  engineRaw.replace([^0-9.]g, '');
      } else { carData.engine = engineRaw.split(' ')[0].replace([^0-9.]g, ''); }
      var lowEng = engineRaw.toLowerCase();
      if (lowEng.includes('hybrid')) carData.fuel = 'hybrid';
      else if (lowEng.includes('diesel')) carData.fuel = 'diesel';
      else if (lowEng.includes('electric')) carData.fuel = 'electric';
      carData.transmission = findVal(['Transmission']).toLowerCase();
      carData.drive = findVal(['Drive Type']).toLowerCase();
      carData.make = findVal(['Make']);
      carData.model = findVal(['Model']);
      carData.color = findVal(['Body Colour', 'Colour', 'Exterior Color']).toLowerCase();
      var steeringRaw = findVal(['Steering', 'Drive Side', 'Hand Drive']).toLowerCase();
      carData.steering = (steeringRaw.includes('right')  window.location.href.includes('.com.au'))  'right'  'left';
      carData.interior = findVal(['Trim', 'Interior', 'Interior Color']).toLowerCase();
      if (!carData.cylinders) carData.cylinders = findVal(['Cylinders']).replace([^d]g, '');
      carData.category = findVal(['Body Type', 'Body Style']).toLowerCase();
      var title = (document.querySelector('.vdp-heading, h1, .vehicle-title')  {}).innerText  '';
      title = title.trim();
      var parts = title.split(' ');
      if (parts.length  0) carData.year = parts[0].replace([^d]g, '');
      carData.photos = Array.from(document.querySelectorAll('.image-carousel img, .vdp-image-viewer img, .gallery-img, .image-container img, .gallery-img img'))
        .map(function (img) { return img.getAttribute('data-src')  img.src; })
        .filter(function (src) { return src && src.includes('http'); });
      SIGNAL.saveData(carData).then(function () {
        alert('✅ მანჰეიმი მზადაა!nკატეგორია ' + carData.category);
      });
    } catch (e) { console.error(e); }
  }

   ── MANHEIM USA ───────────────────────────────────────────────────────────
  function scrapeManheimUsaData() {
    var carData = {
      vin '', mileage '', engine '', make '', model '', year '',
      fuel 'petrol', category '', cylinders '', transmission '', drive '',
      color '', interior '', photos [], featuresList [], steering 'left', unit 'mi'
    };
    try {
      var findVal = function (labels) {
        var detailsDivs = Array.from(document.querySelectorAll('.details-content'));
        for (var label of labels) {
          var targetDiv = detailsDivs.find(function (d) {
            var s = d.querySelector('strong');
            return s && s.innerText.trim().toLowerCase().replace('', '') === label.toLowerCase();
          });
          if (targetDiv) {
            var s = targetDiv.querySelector('span');
            var val = s && s.innerText.trim();
            if (val && val.toLowerCase() !== 'any') return val;
          }
        }
        var all = Array.from(document.querySelectorAll('.key-details-font-header, strong, span, td, th, div'));
        for (var label of labels) {
          var header = all.find(function (el) { return el.innerText && el.innerText.trim().toLowerCase().replace('', '') === label.toLowerCase(); });
          if (header) {
            var val = ((header.nextElementSibling && header.nextElementSibling.innerText) 
                       (header.parentElement && header.parentElement.innerText.replace(header.innerText, ''))).trim();
            if (val && val.toLowerCase() !== 'any') return val;
          }
        }
        return '';
      };
      var vinEl = document.querySelector('[data-test-id=vin]');
      var urlMatch = window.location.href.match(details([A-Z0-9]{17})i);
      if (vinEl) carData.vin = vinEl.textContent.trim();
      else if (urlMatch) carData.vin = urlMatch[1];
      else carData.vin = findVal(['VIN', 'VIN No', 'VIN']);
      var odometerEl = document.querySelector('[data-test-id=odometer]');
      carData.mileage = odometerEl  odometerEl.textContent.replace([^d]g, '')  findVal(['Odometer', 'Mileage', 'Miles']).replace([^d]g, '');
      var engineDispEl = document.querySelector('[data-test-id=engine-displacement]');
      var engineTypeEl = document.querySelector('[data-test-id=engine-type]');
      if (engineDispEl  engineTypeEl) {
        carData.engine = engineDispEl  engineDispEl.textContent.replace([^0-9.]g, '')  '';
        var cylEl = document.querySelector('[data-test-id=engine-cylinders]');
        carData.cylinders = cylEl  cylEl.textContent.replace([^d]g, '')  '';
      } else {
        var engineRaw = findVal(['Engine', 'Displacement']);
        if (engineRaw) {
          var volMatch = engineRaw.match((d+.d+));
          if (volMatch) carData.engine = volMatch[1];
          var cylMatch = engineRaw.match((d+)s[Cc]yl);
          if (cylMatch) carData.cylinders = cylMatch[1];
        }
      }
      var fuelEl = document.querySelector('[data-test-id=fuel-type]');
      var lowEng = fuelEl  fuelEl.textContent.toLowerCase()  findVal(['Engine', 'Displacement', 'Fuel']).toLowerCase();
      if (lowEng.includes('hybrid')) carData.fuel = 'hybrid';
      else if (lowEng.includes('diesel')) carData.fuel = 'diesel';
      else if (lowEng.includes('electric')) carData.fuel = 'electric';
      var transEl = document.querySelector('[data-test-id=transmission]');
      carData.transmission = transEl  transEl.textContent.toLowerCase().replace('•', '').trim()  findVal(['Transmission', 'Trans']).toLowerCase();
      var driveEl = document.querySelector('[data-test-id=drive-train]');
      carData.drive = driveEl  driveEl.textContent.toLowerCase().replace('•', '').trim()  findVal(['Drive Type', 'Drive', 'Drivetrain']).toLowerCase();
      carData.color = findVal(['Exterior Color', 'Body Colour', 'Colour', 'Color']).toLowerCase();
      var interiorEl = document.querySelector('[data-test-id=interior-type]');
      carData.interior = interiorEl  interiorEl.textContent.toLowerCase().replace('•', '').trim()  findVal(['Interior Color', 'Trim', 'Interior']).toLowerCase();
      carData.steering = 'left';
      carData.category = findVal(['Body Style', 'Body Type', 'Body']).toLowerCase();
      var titleEl = document.querySelector('[data-test-id=listing-title]')  document.querySelector('.vdp-heading, h1, .vehicle-title');
      var title = titleEl  titleEl.textContent.trim()  '';
      if (title) {
        var parts = title.split(' ');
        if (parts.length  0) carData.year = parts[0].replace([^d]g, '');
        if (parts.length  1) carData.make = parts[1];
        if (parts.length  2) carData.model = parts.slice(2).join(' ');
      } else {
        carData.make = findVal(['Make']);
        carData.model = findVal(['Model']);
      }
      var rawPhotos = Array.from(document.querySelectorAll('#fyusion-prism-viewer img, .svfy_scroller img, .image-carousel img, .vdp-image-viewer img, .gallery-img, .image-container img, .gallery-img img, .carousel img, .slide img'))
        .map(function (img) { return img.getAttribute('data-src')  img.src; })
        .filter(function (src) { return src && src.includes('http') && !src.includes('icon') && !src.includes('logo') && !src.includes('spinner'); });
      var uniquePhotos = [];
      rawPhotos.forEach(function (src) {
        var cleanSrc = src.replace('_thumb', '');
        if (!uniquePhotos.includes(cleanSrc)) uniquePhotos.push(cleanSrc);
      });
      carData.photos = uniquePhotos;
      SIGNAL.saveData(carData).then(function () {
        alert('✅ Manheim USA მზადაა!nVIN ' + carData.vin + 'nწელი ' + carData.year + 'nმოდელი ' + carData.make + ' ' + carData.model + 'nფოტოები ' + carData.photos.length + ' ცალი');
      });
    } catch (e) { console.error('Manheim USA Error', e); }
  }

   ── IAAI UK ───────────────────────────────────────────────────────────────
  function scrapeIaaiData() {
    var carData = {
      vin '---', mileage '', engine '', make '', model '', year '',
      fuel '', category 'სედანი', cylinders '6', transmission '', drive 'awd',
      color '', interior '', photos [], steering 'right', unit 'miles'
    };
    try {
      var titleEl = document.querySelector('.details-title');
      if (titleEl) {
        var fullTitle = titleEl.innerText.trim();
        var yearMatch = fullTitle.match(^(d{4}));
        if (yearMatch) {
          carData.year = yearMatch[1];
          var remaining = fullTitle.replace(carData.year, '').trim();
          if (remaining.toUpperCase().startsWith('LAND ROVER')) carData.make = 'LAND ROVER';
          else carData.make = remaining.split(' ')[0];
          var modelPart = remaining.replace(carData.make, '').trim();
          carData.model = modelPart.split(d{4}cci)[0].split(d{3}cci)[0].trim();
        }
      }
      var allItems = Array.from(document.querySelectorAll('.list-group-item'));
      var findVal = function (label) {
        var item = allItems.find(function (el) { return el.innerText.includes(label); });
        var el = item && (item.querySelector('.list-group-text-item, .list-group-item-text'));
        return el  el.innerText.trim()  '';
      };
      carData.mileage = findVal('Odometer').replace([^d]g, '');
      carData.color = findVal('Color').toLowerCase();
      carData.transmission = findVal('Gearbox').toLowerCase();
      var engRaw = findVal('Engine');
      var engMatch = engRaw.match((d+));
      if (engMatch) carData.engine = (parseInt(engMatch[1])  1000).toFixed(1);
      if (engRaw.toLowerCase().includes('diesel')) carData.fuel = 'diesel';
      else carData.fuel = 'petrol';
      if (typeof gallery !== 'undefined' && gallery.length  0) {
        carData.photos = gallery.map(function (img) { return img.src; });
      } else {
        var imgs = document.querySelectorAll('.preload img');
        carData.photos = Array.from(imgs).map(function (i) { return i.getAttribute('data-post-load')  i.src; }).filter(function (s) { return s && s.includes('http'); });
      }
      SIGNAL.saveData(carData).then(function () {
        alert('✅ SIGNAL (IAAI UK) მონაცემები მზადაა!nმარკა ' + carData.make + 'nმოდელი ' + carData.model + 'nწელი ' + carData.year);
      });
    } catch (e) { console.error(e); alert('შეცდომა სკანირებისას!'); }
  }

   ── IAAI USA ──────────────────────────────────────────────────────────────
  function scrapeIaaiUsaData() {
    var carData = {
      vin '---', mileage '', engine '', make '', model '', year '',
      fuel 'petrol', category 'სედანი', cylinders '6', transmission '',
      drive 'awd', color '', interior '', photos [], steering 'left', unit 'miles'
    };
    try {
      var titleEl = document.getElementById('TitleSection');
      if (titleEl) {
        var titleText = titleEl.innerText.trim();
        var yearMatch = titleText.match(^(d{4}));
        if (yearMatch) {
          carData.year = yearMatch[1];
          var remaining = titleText.replace(carData.year, '').trim();
          var parts = remaining.split(' ');
          carData.make = parts[0];
          carData.model = remaining.replace(carData.make, '').split('for Auction')[0].trim();
        }
      }
      var findVal = function (label) {
        var items = Array.from(document.querySelectorAll('.data-list__item'));
        var found = items.find(function (i) {
          var s = i.querySelector('span');
          return s && s.innerText.includes(label);
        });
        var v = found && found.querySelector('.data-list__value');
        return v  v.innerText.trim()  '';
      };
      carData.vin = findVal('VIN').split(' ')[0]  '---';
      carData.mileage = findVal('Odometer').replace([^d]g, '');
      carData.color = findVal('Exterior').toLowerCase();
      carData.transmission = findVal('Transmission').toLowerCase();
      var engMatch = findVal('Engine').match((d+.d+));
      carData.engine = engMatch  engMatch[0]  '';
      var driveRaw = findVal('Drive Line Type').toLowerCase();
      if (driveRaw.includes('all')  driveRaw.includes('4')) carData.drive = 'awd';
      else if (driveRaw.includes('front')) carData.drive = 'fwd';
      else carData.drive = 'rwd';
      var collectedPhotos = [];
      Array.from(document.querySelectorAll('img')).forEach(function (img) {
        var src = img.getAttribute('data-src')  img.getAttribute('data-full')  img.src;
        if (src && src.includes('http') && !src.includes('spacer.gif') && !src.includes('placeholder')) {
          if (src.includes('iaai.com')  src.includes('vehicledata')  src.includes('vis')) {
            if (src.startsWith('')) src = 'https' + src;
            collectedPhotos.push(src);
          }
        }
      });
      carData.photos = [...new Set(collectedPhotos)];
      SIGNAL.saveData(carData).then(function () {
        alert('✅ SIGNAL USA მონაცემები მზადაა!nVIN ' + carData.vin + 'nმანქანა ' + carData.make + ' ' + carData.model + 'nფოტოები ' + carData.photos.length + ' ცალი');
      });
    } catch (e) { console.error('SIGNAL USA Error', e); alert('შეცდომა ამერიკული საიტის სკანირებისას!'); }
  }

   ── CARS.COM ──────────────────────────────────────────────────────────────
  function scrapeCarsData() {
    var carData = {
      vin '---', mileage '', engine '', make '', model '', year '',
      fuel 'petrol', category 'ჯიპი', cylinders '', transmission '', drive '',
      color '', interior '', photos [], steering 'left', unit 'miles'
    };
    try {
      var allScripts = Array.from(document.querySelectorAll('script'));
      var ldJsonScripts = allScripts.filter(function (s) { return s.type === 'applicationld+json'; });
      ldJsonScripts.forEach(function (script) {
        try {
          var jsonData = JSON.parse(script.innerText);
          var data = jsonData['@graph']  jsonData['@graph'].find(function (item) { return item['@type'] === 'Vehicle'  item['@type'] === 'Car'; })  (jsonData['@type'] === 'Vehicle'  jsonData  null);
          if (data) {
            if (data.modelDate  data.productionDate) carData.year = (data.modelDate  data.productionDate).toString();
            if (data.manufacturer  data.brand) carData.make = (data.manufacturer && (data.manufacturer.name  data.manufacturer))  (data.brand && (data.brand.name  data.brand));
            if (data.model) carData.model = data.model;
            if (data.vehicleIdentificationNumber) carData.vin = data.vehicleIdentificationNumber;
          }
        } catch (e) {}
      });
      if (!carData.year) {
        for (var script of allScripts) {
          var content = script.innerText;
          if (content.includes('make')  content.includes('year')) {
            var yMatch = content.match(years(d{4}))  content.match(years(d{4}));
            var mMatch = content.match(makes([^]+));
            var modMatch = content.match(models([^]+));
            var vMatch = content.match(vins([^]+));
            if (yMatch) carData.year = yMatch[1]  yMatch[2];
            if (mMatch) carData.make = mMatch[1];
            if (modMatch) carData.model = modMatch[1];
            if (vMatch) carData.vin = vMatch[1];
            if (carData.year && carData.make) break;
          }
        }
      }
      if (!carData.year) {
        var h1Text = (document.querySelector('h1.vdp-header-title')  {}).innerText  document.title;
        var yMatch = h1Text.match(b(1920)d{2}b);
        if (yMatch) {
          carData.year = yMatch[0];
          if (!carData.make) {
            var afterYear = h1Text.split(yMatch[0])[1] && h1Text.split(yMatch[0])[1].trim();
            if (afterYear) {
              var parts = afterYear.split(' ');
              carData.make = parts[0];
              carData.model = parts.slice(1).join(' ').split(' For Sale')[0].trim();
            }
          }
        }
      }
      if (carData.vin === '---') {
        var subtitle = (document.querySelector('.subtitle')  {}).innerText  '';
        var vMatch = subtitle.match(VINs([A-Z0-9]+));
        if (vMatch) carData.vin = vMatch[1];
      }
      if (!carData.mileage) {
        var milStr = (document.querySelector('.vdp-header-mileage')  {}).innerText  '';
        if (!milStr) {
          var msrpEls = Array.from(document.querySelectorAll('.msrp'));
          var mileageEl = msrpEls.find(function (el) { return el.innerText.includes('mi'); });
          if (mileageEl) milStr = mileageEl.innerText;
        }
        if (milStr) carData.mileage = milStr.replace([^0-9]g, '');
      }
      document.querySelectorAll('[data-qa=basics-entry]').forEach(function (li) {
        var txt = li.innerText.toLowerCase();
        if (txt.includes('exterior color')) carData.color = li.innerText.replace(exterior colori, '').trim();
        if (txt.includes('transmission')) carData.transmission = li.innerText.includes('Automatic')  'Automatic'  'Manual';
        if (txt.includes('drivetrain')) carData.drive = li.innerText.replace(drivetraini, '').trim();
        if (txt.includes('fuel type')) carData.fuel = txt.includes('diesel')  'diesel'  'petrol';
        if (txt.includes('engine')) {
          var eng = li.innerText;
          var vMatch2 = eng.match((d+.d)L);
          if (vMatch2) carData.engine = vMatch2[1];
          var cMatch = eng.match(I-(d+)V-(d+));
          if (cMatch) carData.cylinders = cMatch[1]  cMatch[2];
        }
      });
      var photoUrls = [];
      allScripts.forEach(function (script) {
        if (script.innerText.includes('vdpPhotos')) {
          var photosMatch = script.innerText.match(vdpPhotoss([.]));
          if (photosMatch) {
            try {
              JSON.parse(photosMatch[1]).forEach(function (p) {
                if (p.fullUrl) photoUrls.push(p.fullUrl);
                else if (p.largeUrl) photoUrls.push(p.largeUrl);
              });
            } catch (e) {}
          }
        }
      });
      if (photoUrls.length === 0) {
        document.querySelectorAll('img').forEach(function (img) {
          var src = img.src  img.getAttribute('data-src');
          if (src && src.includes('cstatic-images.com')) photoUrls.push(src.replace('thumbnail', 'xxlarge').replace('small', 'xxlarge'));
        });
      }
      carData.photos = [...new Set(photoUrls)].filter(function (u) { return !u.includes('logo'); });
      SIGNAL.saveData(carData).then(function () {
        alert('✅ SIGNAL მზადაა!nწელი ' + carData.year + '  მარკა ' + carData.make + 'nფოტოები ' + carData.photos.length + ' ცალი');
      });
    } catch (e) { alert('შეცდომა სკანირებისას!'); }
  }

   ── EDGE PIPELINE ─────────────────────────────────────────────────────────
  function scrapePipelineData() {
    var carData = {
      vin '---', mileage '', engine '', make '', model '', year '',
      fuel 'petrol', category 'ჯიპი', cylinders '', transmission 'Automatic', drive '',
      color '', interior '', photos [], steering 'left', unit 'miles', source 'pipeline'
    };
    try {
      var ogTitle = (document.querySelector('meta[property=ogtitle]')  {}).content  '';
      if (ogTitle) {
        var yearMatch = ogTitle.match(b(1920)d{2}b);
        if (yearMatch) carData.year = yearMatch[0];
        var cylMatch = ogTitle.match((d+)cyli);
        if (cylMatch) carData.cylinders = cylMatch[1];
        if (ogTitle.toLowerCase().includes('gasoline')) carData.fuel = 'petrol';
        else if (ogTitle.toLowerCase().includes('diesel')) carData.fuel = 'diesel';
        var titleParts = ogTitle.split(' ');
        if (titleParts.length  2) { carData.make = titleParts[1]; carData.model = titleParts.slice(2, 4).join(' '); }
      }
      var photoUrls = [];
      document.querySelectorAll('.fotorama__img').forEach(function (img) {
        var src = img.src;
        if (src && src.includes('http')) photoUrls.push(src.split('')[0]);
      });
      carData.photos = [...new Set(photoUrls)];
      var fields = Array.from(document.querySelectorAll('.field, .cell, .vdp-details__item, td, .odometer'));
      fields.forEach(function (el) {
        var labelText = (el.querySelector('label')  {}).innerText  '';
        var valueText = (el.querySelector('span')  {}).innerText  el.innerText;
        if (labelText.includes('Displacement')  labelText.includes('Engine')) carData.engine = valueText.trim();
        if (labelText.includes('Odometer')  el.classList.contains('odometer')) {
          var val = valueText.replace([^0-9]g, '');
          if (val) carData.mileage = val;
        }
        var text = el.innerText.trim();
        if (text.match(^[A-HJ-NPR-Z0-9]{17}$i)) carData.vin = text.toUpperCase();
      });
      if (carData.vin === '---') {
        var bodyVin = document.body.innerText.match([A-HJ-NPR-Z0-9]{17}i);
        if (bodyVin) carData.vin = bodyVin[0].toUpperCase();
      }
      SIGNAL.saveData(carData).then(function () {
        alert('✅ SIGNAL Pipeline მზადაა!n━━━━━━━━━━━━━━━━━━━━nძრავა ' + (carData.engine  '---') + 'nგარბენი ' + (carData.mileage  '---') + ' milesnფოტოები ' + carData.photos.length + ' ცალი');
      });
    } catch (e) { console.error(e); alert('Pipeline სკანირების შეცდომა!'); }
  }

   ── GUAZI CHINA ───────────────────────────────────────────────────────────
  function scrapeGuaziData() {
    var carData = {
      vin '---', mileage '', engine '', make '', model '', year '',
      fuel 'petrol', category 'სედანი', cylinders '4', transmission 'Automatic', drive 'წინ',
      color 'white', interior '', photos [], steering 'left', unit 'km', source 'guazi', country 'ჩინეთი'
    };
    var brandMap = { '吉利汽车' 'Geely', '吉利' 'Geely', '比亚迪' 'BYD', '长安' 'Changan', '长安汽车' 'Changan', '哈弗' 'Haval', '奇瑞' 'Chery', '大众' 'Volkswagen', '丰田' 'Toyota', '本田' 'Honda', '宝马' 'BMW', '奔驰' 'Mercedes-Benz', '奥迪' 'Audi', '日产' 'Nissan', '别克' 'Buick', '特斯拉' 'Tesla', '五菱' 'Wuling', '宝骏' 'Baojun', '理想' 'Li Auto', '蔚来' 'NIO', '小鹏' 'Xpeng', '现代' 'Hyundai', '起亚' 'Kia', '雪佛兰' 'Chevrolet', '福特' 'Ford', '标致' 'Peugeot', '沃尔沃' 'Volvo', '保时捷' 'Porsche', '雷克萨斯' 'Lexus', '凯迪拉克' 'Cadillac', '马自达' 'Mazda', '斯巴鲁' 'Subaru', '路虎' 'Land Rover', '捷豹' 'Jaguar', '林肯' 'Lincoln', '玛莎拉蒂' 'Maserati', '法拉利' 'Ferrari', '兰博基尼' 'Lamborghini', '劳斯莱斯' 'Rolls-Royce', '宾利' 'Bentley', '阿斯顿马丁' 'Aston Martin', '迈凯伦' 'McLaren', '阿尔法罗密欧' 'Alfa Romeo', 'Jeep' 'Jeep', '吉普' 'Jeep', '克莱斯勒' 'Chrysler', '道奇' 'Dodge', 'MINI' 'Mini', '斯柯达' 'Skoda', '雷诺' 'Renault', '雪铁龙' 'Citroen', 'DS' 'DS', '菲亚特' 'Fiat', '铃木' 'Suzuki', '三菱' 'Mitsubishi', '英菲尼迪' 'Infiniti', '讴歌' 'Acura', '传祺' 'GAC', '荣威' 'Roewe', '名爵' 'MG', '江淮' 'JAC', '奔腾' 'Bestune', '红旗' 'Hongqi', '魏牌' 'WEY', '坦克' 'TANK', '捷途' 'Jetour', '星途' 'Exeed', '领克' 'Lynk & Co', '哪吒' 'NETA', '零跑' 'Leapmotor', '极氪' 'Zeekr', '极狐' 'ARCFOX', '阿维塔' 'Avatr', '问界' 'AITO' };
    var modelMap = { '帝豪' 'Emgrand', '博越' 'Boyue', '星越' 'Xingyue', '缤越' 'Binyue', '雅阁' 'Accord', '思域' 'Civic', '飞度' 'Fit', '凯美瑞' 'Camry', '卡罗拉' 'Corolla', '雷凌' 'Levin', '汉兰达' 'Highlander', '普拉多' 'Prado', '天籁' 'Altima', '轩逸' 'Sylphy', '奇骏' 'X-Trail', '逍客' 'Qashqai', '速腾' 'Jetta', '迈腾' 'Passat', '帕萨特' 'Passat', '朗逸' 'Lavida', '途观' 'Tiguan', '秦PLUS' 'Qin Plus', '宋PLUS' 'Song Plus', '唐' 'Tang', '汉' 'Han', '海豚' 'Dolphin', '海豹' 'Seal', '大狗' 'Dagou', '逸动' 'Eado' };
    var colorMap = { '白' 'white', '黑' 'black', '红' 'red', '蓝' 'blue', '银' 'silver', '灰' 'gray', '棕' 'brown', '黄' 'yellow', '绿' 'green', '橙' 'orange', '金' 'gold', '紫' 'blue' };
    try {
      var ldJsonScripts = document.querySelectorAll('script[type=applicationld+json]');
      var carJson = null;
      ldJsonScripts.forEach(function (script) {
        try {
          var data = JSON.parse(script.innerText);
          if (data['@type'] === 'Product'  data['@type'] === 'Vehicle') carJson = data;
        } catch (e) {}
      });
      if (carJson) {
        if (carJson.name) {
          var nameParts = carJson.name.trim().split(s+);
          if (nameParts[0] && ^d{4}$.test(nameParts[0])) carData.year = nameParts[0];
          var rawMake = nameParts[1]  '';
          carData.make = brandMap[rawMake]  rawMake;
          var rawModel = nameParts.slice(2).join(' ');
          carData.model = modelMap[rawModel]  rawModel;
        }
        if (carJson.offers && carJson.offers.price) carData.mileage = '';
        if (carJson.vehicleEngine && carJson.vehicleEngine.engineDisplacement) {
          var dispStr = carJson.vehicleEngine.engineDisplacement;
          var dispMatch = dispStr.match([d.]+);
          if (dispMatch) carData.engine = parseFloat(dispMatch[0]).toFixed(1);
        }
        if (carJson.fuelType) {
          var fuelLow = carJson.fuelType.toLowerCase();
          if (fuelLow.includes('电')  fuelLow.includes('electric')) carData.fuel = 'electric';
          else if (fuelLow.includes('hybrid')  fuelLow.includes('混')) carData.fuel = 'hybrid';
          else if (fuelLow.includes('diesel')  fuelLow.includes('柴')) carData.fuel = 'diesel';
        }
        if (carJson.mileageFromOdometer && carJson.mileageFromOdometer.value) {
          carData.mileage = String(carJson.mileageFromOdometer.value).replace([^0-9]g, '');
        }
        if (carJson.image) {
          var imagesArray = Array.isArray(carJson.image)  carJson.image.flat(Infinity)  [carJson.image];
          carData.photos = [...new Set(imagesArray.map(function (url) { return url.split('')[0]; }))];
        }
      }
      var rawColor = '';
      if (carJson && carJson.color) rawColor = carJson.color.trim();
      else {
        document.querySelectorAll('.param-item-label').forEach(function (label) {
          if (label.innerText.includes('车身颜色')  label.innerText.includes('颜色')) {
            var v = label.closest('.param-item') && label.closest('.param-item').querySelector('.param-item-value');
            if (v) rawColor = v.innerText.trim();
          }
        });
      }
      if (rawColor) {
        for (var key in colorMap) {
          if (rawColor.includes(key)) { carData.color = colorMap[key]; break; }
        }
      }
      var configSpans = document.querySelectorAll('.config-table-value');
      configSpans.forEach(function (span) {
        var parentRow = span.closest('.config-row');
        if (parentRow) {
          var text = parentRow.innerText.toLowerCase();
          if (text.includes('气缸数')  text.includes('number of cylinders')  text.includes('cylinders')) {
            var cyl = span.innerText.replace([^0-9]g, '');
            if (cyl) carData.cylinders = cyl;
          }
        }
      });
      if (carData.photos.length === 0) {
        var photoUrls = [];
        document.querySelectorAll('img').forEach(function (img) {
          var src = img.src;
          if (src && src.includes('guazistatic.com') && src.includes('.jpg')) photoUrls.push(src.split('')[0]);
        });
        carData.photos = [...new Set(photoUrls)];
      }
      var bodyVin = document.body.innerText.match(b[A-HJ-NPR-Z0-9]{17}bi);
      if (bodyVin) carData.vin = bodyVin[0].toUpperCase();
      SIGNAL.saveData(carData).then(function () {
        alert('✅ SIGNAL Guazi.com მზადაა!n━━━━━━━━━━━━━━━━━━━━nმარკამოდელი ' + carData.make + ' ' + carData.model + 'nVIN კოდი ' + carData.vin + 'nფერი ' + carData.color + 'nძრავა ' + carData.engine + ' (ცილინდრი ' + carData.cylinders + ')nგარბენი ' + carData.mileage + ' kmnფოტოები ' + carData.photos.length + ' ცალი (HD)');
      });
    } catch (e) { console.error(e); alert('Guazi სკანირების შეცდომა!'); }
  }

   ════════════════════════════════════════════════════════════════════════════
   MYAUTO.GE INJECTOR (identical logic to extension, chrome APIs replaced)
   ════════════════════════════════════════════════════════════════════════════
  window.injectDataToMyAuto = async function () {
    var result = await SIGNAL.getData();
    if (!result  !result.car) return alert('ცარიელია! ჯერ სკანირება გაუშვით აუქციონის გვერდზე.');
    var car = result.car;
    var deepClick = function (el) {
      if (!el) return;
      ['mouseover', 'mousedown', 'mouseup', 'click'].forEach(function (evt) {
        el.dispatchEvent(new MouseEvent(evt, { bubbles true, cancelable true, view window }));
      });
    };
    var fClick = function (tid) {
      var el = document.querySelector('[data-testid=' + tid + ']');
      if (el) { deepClick(el); el.click(); }
    };
    var smartSelect = async function (testId, searchText) {
      if (!searchText  searchText === '---') return;
      var trigger = document.querySelector('[data-testid=single-select-trigger-' + testId + ']');
      if (trigger) { deepClick(trigger); await new Promise(function (r) { setTimeout(r, 400); }); }
      var input = document.querySelector('input[data-testid=single-select-search-' + testId + ']');
      if (!input) return;
      input.focus(); input.click(); await new Promise(function (r) { setTimeout(r, 600); });
      input.value = searchText; input.dispatchEvent(new Event('input', { bubbles true }));
      await new Promise(function (r) { setTimeout(r, 1500); });
      var options = Array.from(document.querySelectorAll('div[data-testid=option-' + testId + ']'));
      var target = options.find(function (el) { return el.innerText.trim().toLowerCase() === searchText.toLowerCase().trim(); }) 
                   options.find(function (el) { return el.innerText.trim().toLowerCase().includes(searchText.toLowerCase().trim()); });
      if (target) { deepClick(target); input.dispatchEvent(new Event('change', { bubbles true })); await new Promise(function (r) { setTimeout(r, 600); }); }
    };

     VIN & Mileage
    var vinF = document.querySelector('input[name=primaryFeatures.vinCode]');
    if (vinF && car.vin !== '---') { vinF.value = car.vin; vinF.dispatchEvent(new Event('input', { bubbles true })); }
    var milF = document.querySelector('input[name=primaryFeatures.mileage]');
    if (milF) { milF.value = car.mileage; milF.dispatchEvent(new Event('input', { bubbles true })); }
    if (car.unit === 'miles'  car.unit === 'mi') {
      var trig = document.querySelector('[data-testid=single-select-trigger-primaryFeatures.mileageType]');
      if (trig) { deepClick(trig); await new Promise(function (r) { setTimeout(r, 600); }); fClick('single-select-option-primaryFeatures.mileageType-2'); }
    }

     Make, Model, Year, Engine
    await smartSelect('primaryFeatures.manufacturer', car.make);
    await smartSelect('primaryFeatures.model', car.model);
    await smartSelect('primaryFeatures.issueYear', car.year);
    await smartSelect('primaryFeatures.engineVolume', car.engine);

     Fuel
    var fuelId = MAPS.fuel[(car.fuel  '').toLowerCase()]  '2';
    var fTrig = document.querySelector('[data-testid=single-select-trigger-primaryFeatures.fuelType]');
    if (fTrig) { deepClick(fTrig); await new Promise(function (r) { setTimeout(r, 600); }); var opt = document.querySelector('[data-testid=single-select-option-primaryFeatures.fuelType-' + fuelId + ']'); if (opt) deepClick(opt); }

     Cylinders
    if (car.cylinders) { var cTrig = document.querySelector('[data-testid=single-select-trigger-primaryFeatures.cylinders]'); if (cTrig) { deepClick(cTrig); await new Promise(function (r) { setTimeout(r, 600); }); var cOpt = document.querySelector('[data-testid=single-select-option-primaryFeatures.cylinders-' + car.cylinders + ']'); if (cOpt) deepClick(cOpt); } }

     Category
    var geoCat = 'სედანი';
    var rawCat = (car.category  '').toLowerCase();
    for (var catKey in MAPS.categoryMap) { if (rawCat.includes(catKey)) { geoCat = MAPS.categoryMap[catKey]; break; } }
    var catId = MAPS.categoryIds[geoCat]  '1';
    var catTrigger = document.querySelector('[data-testid=single-select-trigger-primaryFeatures.vehicleCategory]');
    if (catTrigger) { deepClick(catTrigger); await new Promise(function (r) { setTimeout(r, 800); }); var catOption = document.querySelector('[data-testid=single-select-option-primaryFeatures.vehicleCategory-' + catId + ']'); if (catOption) deepClick(catOption); }

     Location (KoreaChina = 22, USA = 21)
    var locTrig = document.querySelector('[data-testid=single-select-trigger-location.location]');
    if (locTrig) {
      deepClick(locTrig); await new Promise(function (r) { setTimeout(r, 800); });
      var locId = (car.source === 'encar'  car.source === 'guazi')  '22'  '21';
      fClick('single-select-child-option-location.location-' + locId);
    }

    await new Promise(function (r) { setTimeout(r, 500); });

     Steering, Gearbox, Airbags, Doors, Drive
    fClick('single-checkbox-primaryFeatures.wheelTypeId-' + (car.steering === 'right'  '1'  '0'));
    fClick('single-checkbox-primaryFeatures.gearTypeId-' + ((car.transmission  '').toLowerCase().includes('auto')  '2'  '1'));
    fClick('single-checkbox-primaryFeatures.airbags-12');
    var doorId = '2';
    if ((rawCat.includes('coupe')  rawCat.includes('cabriolet')) && !rawCat.includes('5d')) doorId = '1';
    fClick('single-checkbox-primaryFeatures.doorTypeId-' + doorId);
    var driveId = '3';
    var dRaw = (car.drive  '').toLowerCase();
    if (dRaw.includes('front')  dRaw.includes('fwd')) driveId = '1';
    else if (dRaw.includes('rear')  dRaw.includes('rwd')) driveId = '2';
    else if (dRaw.includes('all')  dRaw.includes('4')  dRaw.includes('awd')) driveId = '3';
    fClick('single-checkbox-primaryFeatures.driveTypeId-' + driveId);

     Colors
    var vColId = '3';
    for (var colKey in MAPS.colors) { if ((car.color  '').toLowerCase().includes(colKey)) { vColId = MAPS.colors[colKey]; break; } }
    fClick('single-checkbox-primaryFeatures.vehicleColorId-' + vColId);
    var intLow = (car.interior  '').toLowerCase();
    fClick('single-checkbox-primaryFeatures.saloonMaterialId-' + (intLow.includes('leather')  '1'  '2'));
    var sColId = '16';
    for (var sColKey in MAPS.saloonColors) { if (intLow.includes(sColKey)) { sColId = MAPS.saloonColors[sColKey]; break; } }
    fClick('single-checkbox-primaryFeatures.saloonColorId-' + sColId);

     Photos — fetched via Worker image proxy (replaces chrome.runtime.sendMessage)
    if (car.photos && car.photos.length  0) {
      var container = new DataTransfer();
      for (var i = 0; i  Math.min(car.photos.length, 12); i++) {
        try {
          var imgResult = await SIGNAL.getImage(car.photos[i]);
          if (imgResult && imgResult.dataUrl) {
            var parts = imgResult.dataUrl.split(',');
            var mime = parts[0].match((.);)[1];
            var bstr = atob(parts[1]);
            var n = bstr.length;
            var u8arr = new Uint8Array(n);
            while (n--) { u8arr[n] = bstr.charCodeAt(n); }
            var blob = new Blob([u8arr], { type mime });
            container.items.add(new File([blob], 'p_' + i + '.jpg', { type 'imagejpeg' }));
          }
        } catch (e) { console.error('Photo error', e); }
      }
      var fInput = document.querySelector('input[type=file][multiple]');
      if (fInput) { fInput.files = container.files; fInput.dispatchEvent(new Event('change', { bubbles true })); }
    }

    alert('მზადაა! 🥂');
  };

   ── Transfer button on myauto.ge ─────────────────────────────────────────
  function ensureTransferButton() {
    if (!window.location.href.includes('myauto.ge')) return;
    if (document.getElementById('signal-transfer-btn')) return;
    var box = document.createElement('div');
    box.id = 'signal-transfer-btn';
    box.style.cssText = 'positionfixed;top100px;right20px;z-index999999;';
    var btn = document.createElement('button');
    btn.innerHTML = '🚀 გადატანა';
    btn.style.cssText = 'padding15px 20px;background#27ae60;colorwhite;font-weightbold;font-size15px;border-radius10px;cursorpointer;border2px solid #fff;box-shadow0 4px 15px rgba(0,0,0,0.25);font-familyinherit;';
    btn.onmouseover = function () { btn.style.background = '#219a52'; };
    btn.onmouseout = function () { btn.style.background = '#27ae60'; };
    btn.onclick = function () { window.injectDataToMyAuto(); };
    box.appendChild(btn);
    document.body.appendChild(box);
  }

   ════════════════════════════════════════════════════════════════════════════
   URL DISPATCHER — detects current site and runs correct function
   ════════════════════════════════════════════════════════════════════════════
  var url = window.location.href.toLowerCase();

  if (url.includes('myauto.ge')) {
    ensureTransferButton();
  } else if (url.includes('encar.com')) {
    scrapeEncarData();
  } else if (url.includes('copart.de')) {
    scrapeCopartDeData();
  } else if (url.includes('manheim.com.au')) {
    scrapeManheimData();
  } else if (url.includes('manheim.com')) {
    scrapeManheimUsaData();
  } else if (url.includes('copart.com')) {
    scrapeCopartData();
  } else if (url.includes('iaai.co.uk')) {
    scrapeIaaiData();
  } else if (url.includes('iaai.com')) {
    scrapeIaaiUsaData();
  } else if (url.includes('cars.com')) {
    scrapeCarsData();
  } else if (url.includes('edgepipeline.com')) {
    scrapePipelineData();
  } else if (url.includes('guazi.com')) {
    scrapeGuaziData();
  } else {
    alert('⚠️ SIGNAL ეს საიტი მხარდაჭერილი არ არის.nnმხარდაჭერილი საიტებიაnEncar, Copart (USADE), Manheim (USAUKAU),nIAAI (USAUK), Cars.com, Pipeline, Guazi, MyAuto.ge');
  }

})();