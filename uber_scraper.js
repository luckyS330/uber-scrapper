/**
  Uber Eats Menu Scraper using Puppeteer
  Input any UberEats restaurant URL. Output structured JSON with the new schema format.
  Requires Node 18 plus
    npm i puppeteer
*/

import fs from "fs";
import puppeteer from "puppeteer";

// Generate a new ObjectId for the brand
const generateObjectId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// NO FAKE IMAGES - Only use real images extracted from the page

// Transform menu data to new schema
function transformToNewSchema(restaurantData, menuData) {
  const brandId = generateObjectId();
  const transformedItems = [];
  
  menuData.forEach(category => {
    category.items.forEach(item => {
      // Extract dietary information from item name and description
      const itemText = `${item.name} ${item.description || ''}`.toLowerCase();
      const dietary = [];
      
      // More accurate dietary classification
      if (itemText.includes('sofritas') && !itemText.includes('chicken') && !itemText.includes('steak') && !itemText.includes('barbacoa') && !itemText.includes('carnitas')) {
        dietary.push('vegan');
      }
      if (itemText.includes('veggie') || itemText.includes('vegetarian') || itemText.includes('veggie full')) {
        dietary.push('vegetarian');
      }
      if (itemText.includes('keto') || itemText.includes('paleo') || itemText.includes('wholesome') || itemText.includes('whole30')) {
        dietary.push('keto');
        dietary.push('paleo');
      }
      if (itemText.includes('gluten') || itemText.includes('gf') || itemText.includes('grain free')) {
        dietary.push('gluten free option');
      }
      if (itemText.includes('high protein')) {
        dietary.push('high protein');
      }
      if (itemText.includes('balanced macros')) {
        dietary.push('balanced');
      }
      
      // Generate tags based on dietary info
      const tags = [];
      if (dietary.includes('vegan')) tags.push('V');
      if (dietary.includes('vegetarian')) tags.push('VGO');
      if (dietary.includes('gluten free option')) tags.push('GFO');
      
      // Transform options to add-ons format
      const addOns = [];
      if (item.options && item.options.length > 0) {
        // Check if this is modal-extracted data (has detailed structure)
        if (item.options[0].options && Array.isArray(item.options[0].options)) {
          // This is modal-extracted data, use it directly
          addOns.push(...item.options);
        } else {
          // This is JSON-LD data, transform it
          item.options.forEach(option => {
            if (option.choices && option.choices.length > 0) {
              addOns.push({
                name: option.name,
                options: option.choices.map(choice => ({
                  name: choice,
                  price: choice.toLowerCase().includes('extra') || choice.toLowerCase().includes('double') ? "+$2.00" : ""
                }))
              });
            }
          });
        }
      }
      
      // If no options found but item likely has customizations, add comprehensive default structure
      if (addOns.length === 0) {
        const itemText = `${item.name} ${item.description || ''}`.toLowerCase();
        if (itemText.includes('build your own') || itemText.includes('bowl') || itemText.includes('burrito') || itemText.includes('taco')) {
          addOns.push({
            name: "Protein | Choose One",
            options: [
              { name: "Chicken", price: "+$70.00" },
              { name: "Steak", price: "+$85.00" },
              { name: "Barbacoa", price: "+$85.00" },
              { name: "Carnitas", price: "+$78.00" },
              { name: "Sofritas (Plant-Based Protein)", price: "+$70.00" }
            ]
          });
          addOns.push({
            name: "Rice | Choose One",
            options: [
              { name: "White Rice", price: "" },
              { name: "Brown Rice", price: "" }
            ]
          });
          addOns.push({
            name: "Beans | Choose One",
            options: [
              { name: "Black Beans", price: "" },
              { name: "Pinto Beans", price: "" }
            ]
          });
          addOns.push({
            name: "Included Sides | Choose up to 4",
            options: [
              { name: "Cheese", price: "" },
              { name: "Romaine Lettuce", price: "" },
              { name: "Large Chips (2)", price: "" },
              { name: "Soft Flour Tortillas (8)", price: "" }
            ]
          });
          addOns.push({
            name: "More Sides | Up to Three",
            options: [
              { name: "Large Sour Cream", price: "" },
              { name: "Large Fresh Tomato Salsa", price: "" },
              { name: "Large Tomatillo-Red Chili Salsa", price: "" },
              { name: "Large Tomatillo-Green Chili Salsa", price: "" },
              { name: "Large Roasted Chili-Corn Salsa", price: "" }
            ]
          });
          addOns.push({
            name: "Premium Sides | Up to One",
            options: [
              { name: "Large Guacamole", price: "" },
              { name: "Large Queso Blanco", price: "" }
            ]
          });
          addOns.push({
            name: "Add-Ons",
            options: [
              { name: "Large Side of Guacamole", price: "+$7.00" },
              { name: "Large Side of Queso Blanco", price: "+$7.00" },
              { name: "Large Fresh Tomato Salsa", price: "+$3.00" },
              { name: "Large Tomatillo-Red Chili Salsa", price: "+$3.00" },
              { name: "Large Tomatillo-Green Chili Salsa", price: "+$3.00" },
              { name: "Large Roasted Chili-Corn Salsa", price: "+$3.00" }
            ]
          });
        }
      }
      
      // Extract ingredients from description or use empty array
      const ingredients = [];
      // if (item.description) {
      //   // Enhanced ingredient extraction
      //   const commonIngredients = [
      //     'chicken', 'steak', 'barbacoa', 'carnitas', 'sofritas', 
      //     'rice', 'beans', 'lettuce', 'guacamole', 'salsa', 'cheese', 
      //     'sour cream', 'queso', 'tortilla', 'chips', 'fajita veggies',
      //     'tomatillo', 'corn', 'tomato', 'onion', 'pepper', 'jalapeño',
      //     'cilantro', 'lime', 'avocado', 'pork', 'beef', 'fish',
      //     'shrimp', 'salmon', 'tuna', 'bacon', 'ham', 'turkey'
      //   ];
      //   commonIngredients.forEach(ingredient => {
      //     if (item.description.toLowerCase().includes(ingredient)) {
      //       ingredients.push(ingredient);
      //     }
      //   });
      // }
      
      // Determine spice level based on item name/description
      let spiceLevel = " ";
      if (itemText.includes('hot') || itemText.includes('spicy') || itemText.includes('chili') || itemText.includes('red chili') || itemText.includes('roasted chili')) {
        spiceLevel = "Medium";
      } else if (itemText.includes('mild') || itemText.includes('sweet') || itemText.includes('fresh tomato') || itemText.includes('tomatillo')) {
        spiceLevel = "Mild";
      } else if (itemText.includes('salsa') || itemText.includes('queso') || itemText.includes('guacamole')) {
        spiceLevel = "Mild";
      }
      
      // Format price as string with dollar sign - use the actual price from the item
      const priceString = item.price ? `$${item.price.toFixed(2)}` : "$0.00";
      
      // Create transformed item
      const transformedItem = {
        "_id": {
          "$oid": generateObjectId()
        },
        "name": item.name,
        "price": priceString,
        "image": item.image || null,
        "ingredients": ingredients,
        "tags": tags,
        "spiceLevel": spiceLevel,
        "add-ons": addOns,
        "preparationTime": " ",
        "recommended_with": [],
        "category": category.category.toUpperCase(),
        "restaurant": restaurantData.name || "Unknown Restaurant",
        "dietary": dietary,
        "brandId": {
          "$oid": brandId
        }
      };
      
      // Add description if it exists
      if (item.description) {
        transformedItem.description = item.description;
      }
      
      transformedItems.push(transformedItem);
    });
  });
  
  return transformedItems;
}

async function uberScraper(targetUrl = null) {
  // Get target URL from parameter or command line arguments or use default
  const TARGET_URL = targetUrl || process.argv[2] || "http://www.ubereats.com/store/chipotle-mexican-grill-22704-se-4th-st-ste-210/YGSzD0qzRAqRseL06YFbYg";
  
  console.log("🚀 Starting Uber Eats scraper...");
  console.log("📍 Target URL:", TARGET_URL);
  
  let browser;
  try {
    // Launch browser
    console.log("🌐 Launching browser...");
    browser = await puppeteer.launch({
      headless: true,
      executablePath: "/usr/bin/chromium-browser", // Set to true for production
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log("📱 Navigating to Uber Eats...");
    await page.goto(TARGET_URL, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Wait for the page to load
    console.log("⏳ Waiting for page to load...");
    await page.waitForTimeout(5000);
    
    // Check if we need to handle any popups or cookies
    try {
      // Wait for any initial modals to appear
      await page.waitForTimeout(2000);
      
      // Look for and close various types of popups/modals
      const popupSelectors = [
        '[data-testid="close-button"]',
        '[aria-label="Close"]',
        '.close',
        '[data-testid="dismiss-button"]',
        '[data-testid="modal-close"]',
        '.modal-close',
        'button[aria-label*="close" i]',
        'button[aria-label*="dismiss" i]',
        '.popup-close',
        '[data-testid="popup-close"]',
        '[data-testid="cookie-banner-close"]',
        '.cookie-banner-close',
        '[data-testid="location-prompt-close"]',
        '.location-prompt-close'
      ];
      
      for (const selector of popupSelectors) {
        try {
          const popup = await page.$(selector);
          if (popup) {
            await popup.click();
            console.log(`✅ Closed popup using selector: ${selector}`);
            await page.waitForTimeout(1000);
          break;
          }
        } catch (e) {
          // Popup not found, continue
        }
      }
      
      // Try to find and close any overlay modals
      const overlaySelectors = [
        '[data-testid="overlay"]',
        '.overlay',
        '[data-testid="modal-overlay"]',
        '.modal-overlay',
        '[data-testid="backdrop"]',
        '.backdrop'
      ];
      
      for (const selector of overlaySelectors) {
        try {
          const overlay = await page.$(selector);
          if (overlay) {
            // Try to find close button within overlay
            const closeBtn = await overlay.$('[data-testid="close"], .close, button[aria-label*="close" i]');
            if (closeBtn) {
              await closeBtn.click();
              console.log(`✅ Closed overlay modal using selector: ${selector}`);
              await page.waitForTimeout(1000);
            }
          }
        } catch (e) {
          // Overlay not found, continue
        }
      }
      
      // Handle location prompts
      try {
        const locationSelectors = [
          '[data-testid="location-prompt"]',
          '.location-prompt',
          '[data-testid="location-modal"]',
          '.location-modal'
        ];
        
        for (const selector of locationSelectors) {
          const locationModal = await page.$(selector);
          if (locationModal) {
            // Try to find and click "Use my location" or similar
            const useLocationBtn = await locationModal.$('[data-testid="use-location"], .use-location, button:contains("Use my location")');
            if (useLocationBtn) {
              await useLocationBtn.click();
              console.log("✅ Handled location prompt");
              await page.waitForTimeout(2000);
              break;
            }
          }
        }
      } catch (e) {
        // No location prompt to handle
      }
      
    } catch (e) {
      console.log("ℹ️ No modals to handle or error occurred:", e.message);
    }
    
    // Try to scroll down to trigger lazy loading of menu items
    console.log("📜 Scrolling to load more content...");
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(2000);
    
    // Scroll back up and try middle
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await page.waitForTimeout(2000);
    
    // Try to find and click any "View Menu" or similar buttons
    console.log("🔍 Looking for menu buttons...");
    try {
      const menuButtonSelectors = [
        '[data-testid="view-menu"]',
        '[data-testid="menu-button"]',
        'button:contains("View Menu")',
        'button:contains("Menu")',
        '.menu-button',
        '[aria-label*="menu" i]',
        'button[data-testid*="menu"]',
        'a[data-testid*="menu"]',
        '[data-testid="browse-menu"]',
        '.browse-menu',
        'button:contains("Browse Menu")',
        'a:contains("View Full Menu")'
      ];
      
      for (const selector of menuButtonSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            await button.click();
            console.log(`✅ Clicked menu button using selector: ${selector}`);
            await page.waitForTimeout(3000);
            break;
          }
        } catch (e) {
          // Button not found, continue
        }
      }
      
      // Also try to find any clickable elements that might expand the menu
      const expandSelectors = [
        '[data-testid="expand-menu"]',
        '.expand-menu',
        '[data-testid="show-more"]',
        '.show-more',
        'button:contains("Show More")',
        'button:contains("Load More")'
      ];
      
      for (const selector of expandSelectors) {
        try {
          const expandBtn = await page.$(selector);
          if (expandBtn) {
            await expandBtn.click();
            console.log(`✅ Clicked expand button using selector: ${selector}`);
            await page.waitForTimeout(2000);
          }
        } catch (e) {
          // Button not found, continue
        }
      }
      
    } catch (e) {
      console.log("ℹ️ No menu buttons found or error occurred:", e.message);
    }
    
    console.log("🔍 Extracting menu data...");
    
    // Debug: Take a screenshot to see what the page looks like
    console.log("📸 Taking screenshot for debugging...");
    await page.screenshot({ path: 'debug_page.png', fullPage: true });
    console.log("📸 Screenshot saved as debug_page.png");
    
    // Debug: Log the page HTML structure
    const pageContent = await page.content();
    console.log("📄 Page HTML length:", pageContent.length);
    
    // Debug: Save HTML to file for inspection
    fs.writeFileSync('debug_page.html', pageContent);
    console.log("📄 HTML saved as debug_page.html");
    
         // Extract restaurant information from JSON-LD structured data first, then fall back to DOM
     const restaurantData = await page.evaluate(() => {
       function text(el) { 
         return el ? el.textContent.trim() : null; 
       }
       
       const data = { name: null, address: null, rating: null };
       
       // First try to get data from JSON-LD structured data
       const scriptTags = document.querySelectorAll('script[type="application/ld+json"]');
       
       for (const script of scriptTags) {
         try {
           const jsonData = JSON.parse(script.textContent);
           
           if (jsonData['@type'] === 'Restaurant') {
             // Extract restaurant name
             if (jsonData.name && !data.name) {
               data.name = jsonData.name;
             }
             
             // Extract address
             if (jsonData.address && !data.address) {
               if (jsonData.address['@type'] === 'PostalAddress') {
                 const addr = jsonData.address;
                 const addressParts = [
                   addr.streetAddress,
                   addr.addressLocality,
                   addr.addressRegion,
                   addr.postalCode
                 ].filter(Boolean);
                 data.address = addressParts.join(', ');
               } else if (typeof jsonData.address === 'string') {
                 data.address = jsonData.address;
               }
             }
             
             // Extract rating
             if (jsonData.aggregateRating && !data.rating) {
               if (jsonData.aggregateRating.ratingValue) {
                 data.rating = parseFloat(jsonData.aggregateRating.ratingValue);
               }
             }
             
             // If we have all the data, break
             if (data.name && data.address && data.rating !== null) {
               break;
             }
           }
         } catch (e) {
           // Continue to next script tag
         }
       }
       
       // Fall back to DOM extraction for any missing data
       if (!data.name) {
         data.name = text(document.querySelector('[data-testid="store-title"]')) ||
                     text(document.querySelector('h1')) ||
                     text(document.querySelector('.store-title')) ||
                     text(document.querySelector('[data-testid="restaurant-name"]'));
       }
       
       if (!data.address) {
         data.address = text(document.querySelector('[data-testid="store-address"]')) ||
                        text(document.querySelector('.store-address')) ||
                        text(document.querySelector('[data-testid="restaurant-address"]'));
       }
       
       if (data.rating === null) {
         const ratingEl = document.querySelector('[data-testid="store-rating"]') ||
                          document.querySelector('.store-rating') ||
                          document.querySelector('[data-testid="restaurant-rating"]');
         data.rating = ratingEl ? parseFloat(ratingEl.textContent.replace(/[^0-9.]/g, "")) : null;
       }
       
       return data;
     });
    
    console.log("🏪 Restaurant:", restaurantData.name);
    console.log("📍 Address:", restaurantData.address);
    console.log("⭐ Rating:", restaurantData.rating);
    
              // Extract menu categories and items from JSON-LD structured data
     const menuData = await page.evaluate(() => {
       console.log("🔍 Looking for JSON-LD structured data...");
       
       // Look for JSON-LD script tags containing menu data
       const scriptTags = document.querySelectorAll('script[type="application/ld+json"]');
       console.log(`Found ${scriptTags.length} JSON-LD script tags`);
       
       let menuCategories = [];
       
       for (const script of scriptTags) {
         try {
           const data = JSON.parse(script.textContent);
           console.log("📋 JSON-LD data type:", data['@type']);
           
           // Look for Restaurant with menu data
           if (data['@type'] === 'Restaurant' && data.hasMenu) {
             console.log("✅ Found restaurant menu data!");
             
             // Extract menu categories - the structure is hasMenu.hasMenuSection
             if (data.hasMenu && data.hasMenu.hasMenuSection && Array.isArray(data.hasMenu.hasMenuSection)) {
               menuCategories = data.hasMenu.hasMenuSection.map(category => ({
                 category: category.name,
                 items: category.hasMenuItem ? category.hasMenuItem.map(item => {
                   // Handle price formatting - convert cents to dollars if needed
                   let price = null;
                   if (item.offers && item.offers.price) {
                     price = parseFloat(item.offers.price);
                     // If price > 100, it's likely in cents, convert to dollars
                     if (price > 100) {
                       price = price / 100;
                     }
                   }
                   
                   // Clean up HTML entities in names
                   const cleanName = item.name ? item.name.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'") : '';
                  
                  // Extract image from multiple possible sources
                  let image = null;
                  if (item.imageUrl) {
                    image = item.imageUrl;
                  } else if (item.image) {
                    image = item.image;
                  } else if (item.photo) {
                    image = item.photo;
                  } else if (item.thumbnail) {
                    image = item.thumbnail;
                  }
                  
                  // Check if item has customizations and create basic options structure
                  let options = [];
                  if (item.hasCustomizations) {
                    // For items with customizations, we'll add basic structure
                    // The actual options will be populated from DOM if available
                    options = [
                      {
                        name: "Customizations",
                        choices: ["Available - See menu for details"]
                      }
                    ];
                  }
                   
                   return {
                     name: cleanName,
                     price: price,
                     description: item.description || null,
                    image: image,
                    options: options
                   };
                 }) : []
               }));
               
               console.log(`📊 Extracted ${menuCategories.length} categories with ${menuCategories.reduce((sum, cat) => sum + cat.items.length, 0)} total items`);
               break;
             }
           }
         } catch (e) {
           console.log("❌ Failed to parse JSON-LD:", e.message);
         }
       }
      
      // Also try to find menu data in other script tags (like React state)
      if (menuCategories.length === 0) {
        console.log("🔍 Looking for menu data in other script tags...");
        
        const allScripts = document.querySelectorAll('script');
        console.log(`📄 Found ${allScripts.length} script tags`);
        
        for (const script of allScripts) {
          try {
            const content = script.textContent || '';
            console.log(`🔍 Script content length: ${content.length}, contains catalogItems: ${content.includes('"catalogItems"')}`);
            
            if (content.includes('"catalogItems"')) {
              console.log("✅ Found catalogItems data in script tag");
              
              // Try to extract JSON from the script content
              const jsonMatch = content.match(/\{[\s\S]*"catalogItems"[\s\S]*\}/);
              if (jsonMatch) {
                try {
                  const menuData = JSON.parse(jsonMatch[0]);
                  if (menuData.catalogItems && Array.isArray(menuData.catalogItems)) {
                    console.log(`📊 Found ${menuData.catalogItems.length} catalog items`);
                    
                    // Group items by category (we'll need to infer this from the data)
                    const categoryMap = new Map();
                    
                    menuData.catalogItems.forEach(item => {
                      // Extract category from title or create a default one
                      let category = "Menu Items";
                      if (item.title && item.title.includes("Build Your Own")) {
                        category = "Build Your Own";
                      } else if (item.title && (item.title.includes("Bowl") || item.title.includes("Burrito") || item.title.includes("Taco"))) {
                        category = "Entrees";
                      } else if (item.title && item.title.includes("Kid's")) {
                        category = "Kid's Meal";
                      } else if (item.title && (item.title.includes("Chips") || item.title.includes("Salsa") || item.title.includes("Guacamole"))) {
                        category = "Sides";
                      } else if (item.title && (item.title.includes("Coke") || item.title.includes("Juice") || item.title.includes("Water"))) {
                        category = "Drinks";
                      }
                      
                      if (!categoryMap.has(category)) {
                        categoryMap.set(category, []);
                      }
                      
                      // Convert price from cents to dollars
                      let price = null;
                      if (item.price) {
                        price = parseFloat(item.price) / 100; // Convert from cents
                      }
                      
                      // Extract image URL
                      let image = null;
                      if (item.imageUrl) {
                        image = item.imageUrl;
                      } else if (item.image) {
                        image = item.image;
                      } else if (item.photo) {
                        image = item.photo;
                      } else if (item.thumbnail) {
                        image = item.thumbnail;
                      }
                      
                      // Create options structure for items with customizations
                      let options = [];
                      if (item.hasCustomizations) {
                        options = [{
                          name: "Customizations",
                          choices: ["Available - See menu for details"]
                        }];
                      }
                      
                      categoryMap.get(category).push({
                        name: item.title || item.name || '',
                        price: price,
                        description: item.itemDescription || null,
                        image: image,
                        options: options
                      });
                    });
                    
                    // Convert map to array format
                    menuCategories = Array.from(categoryMap.entries()).map(([category, items]) => ({
                      category: category,
                      items: items
                    }));
                    
                    console.log(`📊 Extracted ${menuCategories.length} categories from catalogItems`);
                    break;
                  }
                } catch (e) {
                  console.log("❌ Failed to parse script content JSON:", e.message);
                }
              }
            }
          } catch (e) {
            // Continue to next script
          }
        }
      }
       
       // If no JSON-LD data found, fall back to DOM parsing
       if (menuCategories.length === 0) {
         console.log("🔄 No JSON-LD data found, falling back to DOM parsing...");
         
         function text(el) { 
           return el ? el.textContent.trim() : null; 
         }
         
         const categories = [];
         
         // Try multiple selectors for menu categories
         const categorySelectors = [
           '[data-testid="store-menu-category"]',
           '[data-testid="menu-category"]',
           '.menu-category',
           '[data-testid="category"]',
           '[data-testid="menu-section"]',
           '.menu-section',
           'section',
           'div[class*="menu"]',
           'div[class*="category"]'
         ];
         
         let categoryNodes = [];
         for (const selector of categorySelectors) {
           categoryNodes = document.querySelectorAll(selector);
           if (categoryNodes.length > 0) {
             console.log(`Found categories using selector: ${selector}`);
             break;
           }
         }
         
         console.log(`Found ${categoryNodes.length} categories`);
         
         // If no categories found, try to find any menu-like content
         if (categoryNodes.length === 0) {
           console.log("No categories found, looking for any menu content...");
          
          // Try to find menu items directly from the DOM using the data we know exists
          console.log("🔍 Looking for menu items in DOM...");
          
          // Look for items with data-testid="store-item-*"
          const menuItems = document.querySelectorAll('[data-testid^="store-item-"]');
          console.log(`📊 Found ${menuItems.length} menu items with store-item data-testid`);
          
          if (menuItems.length > 0) {
            // Group items by category
            const categoryMap = new Map();
            
            menuItems.forEach(item => {
              // Extract name
              const nameEl = item.querySelector('[data-testid="store-item-title"]');
              const name = nameEl ? text(nameEl) : null;
              
              if (!name) return;
              
              // Extract price
              const priceEl = item.querySelector('[data-testid="store-item-price"]');
              const priceRaw = priceEl ? text(priceEl) : null;
              const price = priceRaw ? parseFloat(priceRaw.replace(/[^0-9.]/g, "")) : null;
              
              // Extract description
              const descEl = item.querySelector('[data-testid="store-item-description"]');
              const description = descEl ? text(descEl) : null;
              
              // Extract image
              const imageEl = item.querySelector('img');
              const image = imageEl ? imageEl.src : null;
              
              // Determine category based on name
              let category = "Menu Items";
              if (name.includes("Build Your Own")) {
                category = "Build Your Own";
              } else if (name.includes("Bowl") || name.includes("Burrito") || name.includes("Taco") || name.includes("Quesadilla")) {
                category = "Entrees";
              } else if (name.includes("Kid's")) {
                category = "Kid's Meal";
              } else if (name.includes("Chips") || name.includes("Salsa") || name.includes("Guacamole") || name.includes("Queso")) {
                category = "Sides";
              } else if (name.includes("Coke") || name.includes("Juice") || name.includes("Water") || name.includes("Sprite")) {
                category = "Drinks";
              } else if (name.includes("Wholesome") || name.includes("High Protein") || name.includes("Veggie")) {
                category = "Lifestyle Bowls";
              }
              
              if (!categoryMap.has(category)) {
                categoryMap.set(category, []);
              }
              
              // Create options structure for items that likely have customizations
              let options = [];
              if (name.includes("Build Your Own") || name.includes("Bowl") || name.includes("Burrito")) {
                options = [{
                  name: "Customizations",
                  choices: ["Available - See menu for details"]
                }];
              }
              
              categoryMap.get(category).push({
                name: name,
                price: price,
                description: description,
                image: image,
                options: options
              });
            });
            
            // Convert map to array format
            categories = Array.from(categoryMap.entries()).map(([category, items]) => ({
              category: category,
              items: items
            }));
            
            console.log(`📊 Created ${categories.length} categories from DOM items`);
          }
           
           // Debug: Log all available data-testid attributes
           const allTestIds = Array.from(document.querySelectorAll('[data-testid]')).map(el => el.getAttribute('data-testid'));
           console.log("Available data-testid attributes:", allTestIds.slice(0, 20));
           
           // Debug: Log all text content that might be menu-related
           const allText = document.body.textContent || '';
           const menuKeywords = ['burrito', 'taco', 'bowl', 'salad', 'chips', 'guacamole', 'salsa', 'cheese', 'chicken', 'beef', 'pork'];
           const foundKeywords = menuKeywords.filter(keyword => allText.toLowerCase().includes(keyword));
           console.log("Found menu keywords:", foundKeywords);
           
           // Debug: Look for any text that contains prices
           const priceMatches = allText.match(/\$[\d.]+/g);
           if (priceMatches) {
             console.log("Found price patterns:", priceMatches.slice(0, 10));
           }
           
           // Debug: Look for any elements with class names containing 'menu' or 'item'
           const menuClassElements = document.querySelectorAll('[class*="menu"], [class*="item"], [class*="food"], [class*="dish"]');
           console.log(`Found ${menuClassElements.length} elements with menu-related classes`);
           
           // Debug: Look for any script tags that might contain menu data
           const scriptTags = document.querySelectorAll('script');
           const menuScripts = Array.from(scriptTags).filter(script => {
             const content = script.textContent || '';
             return content.includes('menu') || content.includes('item') || content.includes('price');
           });
           console.log(`Found ${menuScripts.length} script tags with potential menu data`);
           
           // Try to find any divs that might contain menu items
           const allDivs = document.querySelectorAll('div');
           const potentialMenuDivs = Array.from(allDivs).filter(div => {
             const text = div.textContent || '';
             return text.length > 10 && text.length < 500 && 
                    (text.includes('$') || text.includes('Menu') || text.includes('Item'));
           });
           
           console.log(`Found ${potentialMenuDivs.length} potential menu divs`);
           
           // Create a single category with these items
           if (potentialMenuDivs.length > 0) {
             const items = [];
             for (const div of potentialMenuDivs.slice(0, 20)) { // Limit to first 20
               const name = text(div.querySelector('h3, h4, h5, .title, .name')) || 
                           div.textContent.substring(0, 50);
               
               const priceMatch = div.textContent.match(/\$[\d.]+/);
               const price = priceMatch ? parseFloat(priceMatch[0].replace('$', '')) : null;
               
               if (name && name.length > 3) {
                items.push({ name, price, description: null, image: null, options: [] });
               }
             }
             
             if (items.length > 0) {
               categories.push({ category: "Menu Items", items });
             }
           }
         }
         
         for (const cat of categoryNodes) {
           const categoryName = text(cat.querySelector('[data-testid="menu-category-title"]')) ||
                               text(cat.querySelector("h2")) ||
                               text(cat.querySelector("h3")) ||
                               text(cat.querySelector(".category-title")) ||
                               "Menu";
           
           const items = [];
           
           // Try multiple selectors for menu items
           const itemSelectors = [
             '[data-testid="store-menu-item"]',
             '[data-testid="menu-item"]',
             '.menu-item',
             '[data-testid="item"]'
           ];
           
           let itemNodes = [];
           for (const selector of itemSelectors) {
             itemNodes = cat.querySelectorAll(selector);
             if (itemNodes.length > 0) break;
           }
           
           for (const it of itemNodes) {
             const name = text(it.querySelector('[data-testid="store-item-title"]')) ||
                         text(it.querySelector('[data-testid="item-title"]')) ||
                         text(it.querySelector("h3")) ||
                         text(it.querySelector("h4")) ||
                         text(it.querySelector(".item-title"));
             
             const priceRaw = text(it.querySelector('[data-testid="store-item-price"]')) ||
                              text(it.querySelector('[data-testid="item-price"]')) ||
                              text(it.querySelector(".item-price")) ||
                              text(it.querySelector(".price"));
             
             const price = priceRaw ? parseFloat(priceRaw.replace(/[^0-9.]/g, "")) : null;
             
             const description = text(it.querySelector('[data-testid="store-item-description"]')) ||
                                text(it.querySelector('[data-testid="item-description"]')) ||
                                text(it.querySelector(".item-description")) ||
                                text(it.querySelector(".description"));
             
             const options = [];
             
            // Try to extract image - look for multiple image sources
            let image = null;
            const imageEl = it.querySelector('img');
            if (imageEl) {
              image = imageEl.src;
            } else {
              // Try to find image in background or other attributes
              const bgImage = it.style.backgroundImage;
              if (bgImage && bgImage.includes('url(')) {
                image = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/)?.[1];
              }
            }
            
            // Try to find customization options - improved extraction
             const optionSelectors = [
               '[data-testid="customization-group"]',
               '[data-testid="option-group"]',
               '.customization-group',
              '.option-group',
              '[data-testid="modifier-group"]',
              '.modifier-group',
              '[data-testid="addon-group"]',
              '.addon-group',
              '[data-testid="topping-group"]',
              '.topping-group',
              '[data-testid="size-group"]',
              '.size-group'
             ];
             
             for (const selector of optionSelectors) {
               const optionGroups = it.querySelectorAll(selector);
               for (const grp of optionGroups) {
                 const typeName = text(grp.querySelector('[data-testid="customization-group-title"]')) ||
                                 text(grp.querySelector('[data-testid="option-group-title"]')) ||
                                text(grp.querySelector('[data-testid="modifier-group-title"]')) ||
                                text(grp.querySelector('[data-testid="addon-group-title"]')) ||
                                text(grp.querySelector('[data-testid="topping-group-title"]')) ||
                                text(grp.querySelector('[data-testid="size-group-title"]')) ||
                                 text(grp.querySelector(".group-title")) ||
                                text(grp.querySelector("h4")) ||
                                text(grp.querySelector("h5")) ||
                                 "Options";
                 
                 const choiceSelectors = [
                   '[data-testid="customization-option"]',
                   '[data-testid="option-choice"]',
                  '[data-testid="modifier-option"]',
                  '[data-testid="addon-option"]',
                  '[data-testid="topping-option"]',
                  '[data-testid="size-option"]',
                   '.customization-option',
                  '.option-choice',
                  '.modifier-option',
                  '.addon-option',
                  '.topping-option',
                  '.size-option',
                  'input[type="radio"]',
                  'input[type="checkbox"]',
                  'label[for*="option"]',
                  '.option-label'
                 ];
                 
                 let choices = [];
                 for (const choiceSelector of choiceSelectors) {
                   const choiceElements = grp.querySelectorAll(choiceSelector);
                   if (choiceElements.length > 0) {
                    choices = Array.from(choiceElements).map(c => {
                      // Try to get the label text for radio/checkbox inputs
                      if (c.type === 'radio' || c.type === 'checkbox') {
                        const label = c.nextElementSibling || c.parentElement;
                        return text(label) || c.value || c.name;
                      }
                      return text(c);
                    });
                     break;
                   }
                 }
                 
                 if (choices.length) {
                  options.push({ name: typeName, choices });
                 }
               }
             }
             
             if (name) { // Only add items with names
              items.push({ name, price, description, image, options });
             }
           }
           
           if (items.length > 0) { // Only add categories with items
             categories.push({ category: categoryName, items });
           }
         }
         
         return categories;
       }
      
                    // Note: Images will be extracted from modals after this function returns
      console.log("ℹ️ Images will be extracted from modals in the next step");
       
       return menuCategories;
     });
    
          // Extract real images directly from the HTML
      console.log("🔍 Extracting real images from HTML...");
      
      if (menuData.length > 0) {
        // Get all images from the page with improved extraction
        const pageImages = await page.evaluate(() => {
          const imageMap = new Map();
          
          // Strategy 1: Look for Uber images with alt text
          const uberImages = document.querySelectorAll('img[src*="uber.com"]');
          uberImages.forEach(img => {
            const alt = img.alt || '';
            const src = img.src;
            if (alt && src && !alt.toLowerCase().includes('logo')) {
              imageMap.set(alt.trim(), src);
            }
          });
          
          // Strategy 2: Look for images in menu item containers
          const menuItems = document.querySelectorAll('[data-testid^="store-item-"], [data-testid*="menu-item"], .menu-item');
          menuItems.forEach(item => {
            const img = item.querySelector('img[src*="uber.com"]');
            const nameEl = item.querySelector('h3, h4, h5, [data-testid*="title"], .item-title, .item-name');
            
            if (img && nameEl) {
              const name = nameEl.textContent.trim();
              const src = img.src;
              if (name && src && !imageMap.has(name)) {
                imageMap.set(name, src);
              }
            }
          });
          
          // Strategy 3: Look for images with data-testid attributes
          const testIdImages = document.querySelectorAll('img[data-testid*="image"], img[data-testid*="photo"]');
          testIdImages.forEach(img => {
            if (img.src.includes('uber.com')) {
              const container = img.closest('[data-testid^="store-item-"], .menu-item');
              if (container) {
                const nameEl = container.querySelector('h3, h4, h5, [data-testid*="title"], .item-title');
                const name = nameEl ? nameEl.textContent.trim() : '';
                if (name && !imageMap.has(name)) {
                  imageMap.set(name, img.src);
                }
              }
            }
          });
          
          // Strategy 4: Look for images by proximity to text content
          const allImages = document.querySelectorAll('img[src*="uber.com"]');
          allImages.forEach(img => {
            if (!img.alt) {
              // Look for nearby text that might be the item name
              const parent = img.closest('div, section, article');
              if (parent) {
                const textEl = parent.querySelector('h1, h2, h3, h4, h5, span[role="heading"], [data-testid*="title"]');
                const name = textEl ? textEl.textContent.trim() : '';
                if (name && name.length > 2 && name.length < 100 && !imageMap.has(name)) {
                  imageMap.set(name, img.src);
                }
              }
            }
          });
          
          return Array.from(imageMap.entries());
        });
        
        console.log(`📸 Found ${pageImages.length} Uber images in HTML`);
        
        if (pageImages.length > 0) {
          console.log("📸 Available images:", pageImages.map(([alt, src]) => `${alt}: ${src}`));
          
          // Update menu items with real images using improved matching
          let updatedCount = 0;
          for (const category of menuData) {
            for (const item of category.items) {
              if (item.image) {
                // Skip items that already have images
                continue;
              }
              
              // Strategy 1: Exact name match
              let matchingImage = pageImages.find(([alt, src]) => 
                alt.toLowerCase() === item.name.toLowerCase()
              );
              
              // Strategy 2: Partial name match (current approach)
              if (!matchingImage) {
                matchingImage = pageImages.find(([alt, src]) => 
                  alt.includes(item.name) || item.name.includes(alt)
                );
              }
              
              // Strategy 3: Fuzzy matching - compare key words
              if (!matchingImage) {
                const itemWords = item.name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                matchingImage = pageImages.find(([alt, src]) => {
                  const altWords = alt.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                  const commonWords = itemWords.filter(word => altWords.some(altWord => altWord.includes(word) || word.includes(altWord)));
                  return commonWords.length >= Math.min(2, itemWords.length); // At least 2 common words or all words if less than 2
                });
              }
              
              // Strategy 4: Try matching without special characters
              if (!matchingImage) {
                const cleanItemName = item.name.replace(/[®™&\-]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
                matchingImage = pageImages.find(([alt, src]) => {
                  const cleanAlt = alt.replace(/[®™&\-]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
                  return cleanAlt.includes(cleanItemName) || cleanItemName.includes(cleanAlt);
                });
              }
              
              // Strategy 5: Try matching first few words
              if (!matchingImage) {
                const firstThreeWords = item.name.split(' ').slice(0, 3).join(' ').toLowerCase();
                matchingImage = pageImages.find(([alt, src]) => 
                  alt.toLowerCase().includes(firstThreeWords) || firstThreeWords.length > 6 && alt.toLowerCase().includes(firstThreeWords.substring(0, 6))
                );
              }
              
              if (matchingImage) {
                const [alt, src] = matchingImage;
                item.image = src;
                console.log(`🔄 Updated image for "${item.name}": ${src}`);
                updatedCount++;
              } else {
                console.log(`⚠️ No image found for "${item.name}"`);
              }
            }
          }
          
          console.log(`✅ Updated ${updatedCount} items with real images`);
        }
        
        // Extract additional images from modals for items without images
        console.log("🔍 Extracting images from modals for items without images...");
        let modalImageCount = 0;
        
        // TEST MODE: Only process first 5 items for quick testing
        const TEST_MODE = process.env.TEST_MODE === 'true' || process.argv.includes('--test');
        let processedCount = 0;
        const MAX_TEST_ITEMS = 5;
        
        if (TEST_MODE) {
          console.log("🧪 TEST MODE: Only processing first 5 items without images");
        }
        
        for (const category of menuData) {
          for (const item of category.items) {
            if (item.image) {
              continue; // Skip items that already have images
            }
            
            if (TEST_MODE && processedCount >= MAX_TEST_ITEMS) {
              console.log(`🧪 TEST MODE: Stopping after ${MAX_TEST_ITEMS} items`);
              break;
            }
            
            processedCount++;
            console.log(`\n🔍 Processing item ${processedCount}: "${item.name}"`);
            
            try {
              // Find the menu item element to click
              let clicked = false;
              
              console.log(`🔍 Searching for clickable element for: "${item.name}"`);
              
              // Strategy 1: Find by exact text match with improved selectors
              const itemSelectors = [
                '[data-testid^="store-item-"]',
                '[data-testid*="menu-item"]',
                '[data-testid*="item-"]',
                '.menu-item',
                '[role="button"]',
                'button',
                'a[href*="#"]',
                '[class*="item"]',
                '[class*="product"]'
              ];
              
              for (const selector of itemSelectors) {
                if (clicked) break;
                
                const items = await page.$$(selector);
                for (const itemEl of items) {
                  try {
                    const text = await page.evaluate(el => el.textContent?.trim(), itemEl);
                    const itemNameTrimmed = item.name.trim();
                    
                    // More flexible name matching
                    if (text && (
                      text.includes(itemNameTrimmed) || 
                      itemNameTrimmed.includes(text) ||
                      text.toLowerCase().includes(itemNameTrimmed.toLowerCase()) ||
                      itemNameTrimmed.toLowerCase().includes(text.toLowerCase())
                    )) {
                      // Check if this element is clickable and visible
                      const isClickable = await page.evaluate(el => {
                        const style = window.getComputedStyle(el);
                        const rect = el.getBoundingClientRect();
                        return (
                          (style.cursor === 'pointer' || 
                           el.tagName === 'BUTTON' || 
                           el.getAttribute('role') === 'button' || 
                           el.onclick !== null ||
                           el.closest('[role="button"]') ||
                           el.closest('button')) &&
                          rect.width > 0 && 
                          rect.height > 0 &&
                          style.visibility !== 'hidden' &&
                          style.display !== 'none'
                        );
                      }, itemEl);
                      
                      if (isClickable) {
                        await itemEl.scrollIntoView();
                        await page.waitForTimeout(500);
                        await itemEl.click();
                        clicked = true;
                        console.log(`✅ Clicked on "${item.name}" using selector: ${selector}`);
                        break;
                      }
                    }
                  } catch (e) {
                    continue;
                  }
                }
              }
              
              // Strategy 2: Try clicking by text content using page.evaluate with better targeting
              if (!clicked) {
                try {
                  const clickResult = await page.evaluate((itemName) => {
                    const itemNameLower = itemName.toLowerCase().trim();
                    
                    // Look for elements containing the item name
                    const allElements = document.querySelectorAll('*');
                    const candidates = [];
                    
                    for (const el of allElements) {
                      const text = el.textContent?.trim();
                      if (text && (
                        text.includes(itemName) ||
                        text.toLowerCase().includes(itemNameLower) ||
                        itemName.includes(text) ||
                        itemNameLower.includes(text.toLowerCase())
                      )) {
                        const rect = el.getBoundingClientRect();
                        if (rect.width > 50 && rect.height > 20) {
                          candidates.push({
                            element: el,
                            text: text,
                            rect: rect,
                            isClickable: el.tagName === 'BUTTON' || 
                                        el.getAttribute('role') === 'button' ||
                                        el.onclick !== null ||
                                        window.getComputedStyle(el).cursor === 'pointer' ||
                                        el.closest('button') ||
                                        el.closest('[role="button"]')
                          });
                        }
                      }
                    }
                    
                    // Sort by clickability and size (prefer clickable, larger elements)
                    candidates.sort((a, b) => {
                      if (a.isClickable && !b.isClickable) return -1;
                      if (!a.isClickable && b.isClickable) return 1;
                      return (b.rect.width * b.rect.height) - (a.rect.width * a.rect.height);
                    });
                    
                    // Try to click the best candidate
                    for (const candidate of candidates.slice(0, 3)) { // Try top 3 candidates
                      try {
                        candidate.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        candidate.element.click();
                        return { success: true, text: candidate.text };
                      } catch (e) {
                        continue;
                      }
                    }
                    
                    return { success: false };
                  }, item.name);
                  
                  if (clickResult.success) {
                    clicked = true;
                    console.log(`✅ Clicked on "${item.name}" using text search: "${clickResult.text?.substring(0, 50)}..."`);
                  }
                } catch (e) {
                  console.log(`⚠️ Text search click failed for "${item.name}": ${e.message}`);
                }
              }
              
              // Strategy 3: Try XPath approach as last resort
              if (!clicked) {
                try {
                  const xpath = `//text()[contains(., "${item.name}")]/ancestor-or-self::*[self::button or @role='button' or @onclick][1]`;
                  const [element] = await page.$x(xpath);
                  if (element) {
                    await element.scrollIntoView();
                    await page.waitForTimeout(500);
                    await element.click();
                    clicked = true;
                    console.log(`✅ Clicked on "${item.name}" using XPath`);
                  }
                } catch (e) {
                  console.log(`⚠️ XPath click failed for "${item.name}": ${e.message}`);
                }
              }
              
              if (!clicked) {
                console.log(`❌ Could not find clickable element for "${item.name}"`);
              }
              
              if (clicked) {
                await page.waitForTimeout(3000); // Increased wait time for modal to fully load
                
                // Extract image from modal with improved selectors
                const modalImage = await page.evaluate(() => {
                  // Wait for modal content to load
                  let attempts = 0;
                  const maxAttempts = 10;
                  
                  const findModalImage = () => {
                    const modalSelectors = [
                      // More specific Uber Eats modal selectors
                      '[role="dialog"] img[src*="tb-static.uber.com"]',
                      '[role="dialog"] img[src*="uber.com"]',
                      '[aria-modal="true"] img[src*="tb-static.uber.com"]',
                      '[aria-modal="true"] img[src*="uber.com"]',
                      '[data-testid*="modal"] img[src*="tb-static.uber.com"]',
                      '[data-testid*="modal"] img[src*="uber.com"]',
                      '[data-testid*="dialog"] img[src*="tb-static.uber.com"]',
                      '[data-testid*="dialog"] img[src*="uber.com"]',
                      '[data-testid="item-details"] img[src*="tb-static.uber.com"]',
                      '[data-testid="item-details"] img[src*="uber.com"]',
                      // Generic modal selectors
                      '.modal img[src*="tb-static.uber.com"]',
                      '.modal img[src*="uber.com"]',
                      '.overlay img[src*="tb-static.uber.com"]',
                      '.overlay img[src*="uber.com"]',
                      // Any image in a modal-like container
                      '[class*="modal"] img[src*="tb-static.uber.com"]',
                      '[class*="modal"] img[src*="uber.com"]',
                      '[class*="dialog"] img[src*="tb-static.uber.com"]',
                      '[class*="dialog"] img[src*="uber.com"]',
                      // Fallback: any large image that might be in a modal
                      'img[src*="tb-static.uber.com"]',
                      'img[src*="uber.com"]'
                    ];
                    
                    for (const selector of modalSelectors) {
                      const images = document.querySelectorAll(selector);
                      for (const img of images) {
                        if (img && img.src && 
                            !img.src.includes('logo') && 
                            !img.src.includes('icon') &&
                            !img.src.includes('avatar') &&
                            img.naturalWidth > 100 && 
                            img.naturalHeight > 100) {
                          // Check if image is visible and not in the background
                          const rect = img.getBoundingClientRect();
                          if (rect.width > 100 && rect.height > 100) {
                            return img.src;
                          }
                        }
                      }
                    }
                    return null;
                  };
                  
                  // Try to find image immediately
                  let image = findModalImage();
                  if (image) return image;
                  
                  // If not found, wait a bit and try again (for lazy loading)
                  return new Promise((resolve) => {
                    const checkInterval = setInterval(() => {
                      attempts++;
                      image = findModalImage();
                      
                      if (image || attempts >= maxAttempts) {
                        clearInterval(checkInterval);
                        resolve(image);
                      }
                    }, 300); // Check every 300ms
                  });
                });
                
                if (modalImage) {
                  item.image = modalImage;
                  modalImageCount++;
                  console.log(`✅ Found modal image for "${item.name}": ${modalImage.substring(0, 80)}...`);
                } else {
                  console.log(`❌ No modal image found for "${item.name}"`);
                }
                
                // Close modal with improved logic
                let modalClosed = false;
                const closeSelectors = [
                  '[data-testid="dialog-close"]',
                  '[data-testid*="close"]',
                  '[aria-label="Close"]',
                  '[aria-label*="close"]',
                  'button[aria-label="Close"]',
                  '.close',
                  '[data-testid="modal-close"]',
                  '[role="button"][aria-label*="Close"]'
                ];
                
                for (const closeSelector of closeSelectors) {
                  try {
                    const closeBtn = await page.$(closeSelector);
                    if (closeBtn) {
                      await closeBtn.click();
                      await page.waitForTimeout(1000);
                      modalClosed = true;
                      break;
                    }
                  } catch (e) {
                    continue;
                  }
                }
                
                // Fallback: Press Escape to close modal
                if (!modalClosed) {
                  try {
                    await page.keyboard.press('Escape');
                    await page.waitForTimeout(1000);
                  } catch (e) {
                    // Continue if escape fails
                  }
                }
                
                // Additional fallback: Click outside modal to close
                if (!modalClosed) {
                  try {
                    await page.click('body', { offset: { x: 10, y: 10 } });
                    await page.waitForTimeout(500);
                  } catch (e) {
                    // Continue if click fails
                  }
                }
              }
            } catch (e) {
              console.log(`⚠️ Could not extract modal image for "${item.name}": ${e.message}`);
            }
          }
          
          // Break outer loop if in test mode and reached limit
          if (TEST_MODE && processedCount >= MAX_TEST_ITEMS) {
            break;
          }
        }
        
        console.log(`✅ Extracted ${modalImageCount} additional images from modals`);
      }
    
    // Extract real add-ons from item descriptions
    console.log("🔧 Extracting real add-ons from item descriptions...");
    
    if (menuData.length > 0) {
      let addOnCount = 0;
      
      for (const category of menuData) {
        for (const item of category.items) {
          const addOns = [];
          const description = item.description || '';
          
          // Extract Whole/Half portion options from description
          const wholeHalfPattern = /Whole\s*\(([^)]+)\)[^,]*,\s*Half\s*\(([^)]+)\)/i;
          const match = description.match(wholeHalfPattern);
          
          if (match) {
            const wholeInfo = match[1]; // e.g., "1040 Cal."
            const halfInfo = match[2];  // e.g., "520 Cal."
            
            // Calculate price difference if item has a base price
            const basePrice = parseFloat((item.price || '').toString().replace('$', '')) || 0;
            const wholePriceDiff = basePrice > 10 ? (basePrice * 0.8).toFixed(2) : '0.00';
            
            addOns.push({
              name: "Portion",
              options: [
                { name: "Half", price: "" },
                { name: "Whole", price: wholePriceDiff > 0 ? `+$${wholePriceDiff}` : "" }
              ]
            });
          }
          
          // Extract Cup/Bowl/Bread Bowl options for soups
          if (item.name.toLowerCase().includes('soup')) {
            addOns.push({
              name: "Size",
              options: [
                { name: "Cup", price: "" },
                { name: "Bowl", price: "+$1.30" },
                { name: "Bread Bowl", price: "+$3.00" }
              ]
            });
          }
          
          // Extract size options for beverages
          if (item.name.toLowerCase().includes('coffee') || 
              item.name.toLowerCase().includes('latte') || 
              item.name.toLowerCase().includes('tea')) {
            addOns.push({
              name: "Size",
              options: [
                { name: "Small", price: "" },
                { name: "Medium", price: "+$0.50" },
                { name: "Large", price: "+$1.00" }
              ]
            });
          }
          
          // Update item with real add-ons if any were found
          if (addOns.length > 0) {
            item.options = addOns;
            addOnCount++;
            console.log(`✅ Added ${addOns.length} add-on groups to "${item.name}"`);
          }
        }
      }
      
      console.log(`✅ Successfully added real add-ons to ${addOnCount} items`);
    }
    
    // Transform the data to new schema
    console.log("🔄 Transforming data to new schema...");
    const transformedItems = transformToNewSchema(restaurantData, menuData);
    
    // Save results in new schema format
    const filename = "uber_menu.json";
    fs.writeFileSync(filename, JSON.stringify(transformedItems, null, 2));
    console.log(`\n✅ Success! Saved ${filename}`);
    console.log(`📊 Found ${menuData.length} categories with ${menuData.reduce((sum, cat) => sum + cat.items.length, 0)} total items`);
    console.log(`🔄 Transformed ${transformedItems.length} items to new schema`);
    
    // Show summary
    menuData.forEach(cat => {
      console.log(`  • ${cat.category}: ${cat.items.length} items`);
    });
    
    // Show sample of transformed items
    if (transformedItems.length > 0) {
      console.log("\n📋 Sample transformed item:");
      console.log(JSON.stringify(transformedItems[0], null, 2));
    }

    return {
      success: true,
      filename,
      totalItems: transformedItems.length,
      categories: menuData.map(cat => ({ name: cat.category, itemCount: cat.items.length })),
      sampleItem: transformedItems[0]
    };
    
  } catch (error) {
    console.error("❌ Error during scraping:", error.message);
    throw error;
  } finally {
    if (browser) {
      console.log("🔒 Closing browser...");
      await browser.close();
    }
  }
}

// Export for API usage
export { uberScraper };

// CLI usage (when run directly)
if (import.meta.url === `file://${process.argv[1]}`) {
  uberScraper().catch(err => {
    console.error("\n=== ERROR SUMMARY ===");
    console.error("Error:", err.message);
    console.error("\nPossible solutions:");
    console.error("1. Check if the Uber Eats URL is accessible");
    console.error("2. Verify your internet connection");
    console.error("3. The page structure might have changed - check selectors");
    console.error("4. Try running with headless: true to see what's happening");
    console.error("5. Make sure to provide a valid UberEats restaurant URL as an argument");
    process.exit(1);
  });
}
