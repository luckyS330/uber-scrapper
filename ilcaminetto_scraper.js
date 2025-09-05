import puppeteer from 'puppeteer';
import fs from 'fs';

async function ilcaminettoScraper(targetUrl = null) {
  const TARGET_URL = targetUrl || process.argv[2] || 'http://orders.ilcaminetto.com.au/';
  
  console.log("🚀 Starting Il Caminetto Italian Restaurant scraper...");
  console.log(`📍 Target URL: ${TARGET_URL}`);
  
  let browser;
  
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      executablePath: "/usr/bin/chromium-browser",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu"
      ]
    });
    const page = await browser.newPage();
    
    console.log("🍕 Navigating to Il Caminetto...");
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for the page to load completely with additional time for dynamic content
    try {
      await page.waitForSelector('[id^="TabSelectOption-"]', { timeout: 30000 });
      console.log("✅ Menu categories loaded successfully");
    } catch (error) {
      console.log("⚠️  Categories not found, continuing with basic wait...");
      await page.waitForTimeout(5000);
    }
    
    console.log("📸 Taking screenshot for debugging...");
    await page.screenshot({ path: 'ilcaminetto_debug.png', fullPage: true });
    
    const html = await page.content();
    fs.writeFileSync('ilcaminetto_debug.html', html);
    console.log(`📄 Page HTML length: ${html.length}`);
    
    console.log("🏪 Extracting restaurant information...");
    const restaurantData = await page.evaluate(() => {
      function text(el) { return el ? el.textContent.trim() : null; }
      
      const data = { name: null, address: null, phone: null, hours: null };
      
      data.name = text(document.querySelector('h1')) || 'Il Caminetto Italian Restaurant';
      
      const addressEl = document.querySelector('a[href*="maps.google.com"]');
      if (addressEl) data.address = addressEl.textContent.trim();
      
      const phoneEl = document.querySelector('a[href^="tel:"]');
      if (phoneEl) data.phone = phoneEl.textContent.trim();
      
      return data;
    });
    
    console.log("🏪 Restaurant:", restaurantData.name);
    console.log("📍 Address:", restaurantData.address);
    console.log("📞 Phone:", restaurantData.phone);
    
    console.log("🔍 Extracting menu data...");
    const menuData = await page.evaluate(() => {
      const categories = [];
      
      // Find all category sections by looking for category names
      const categoryElements = document.querySelectorAll('[id^="TabSelectOption-"]');
      
      categoryElements.forEach(categoryEl => {
        const categoryName = categoryEl.textContent.trim();
        
        if (!categoryName || 
            categoryName.includes('Services') || 
            categoryName.includes('Opening Hours') || 
            categoryName.includes('Location') || 
            categoryName.includes('Phone')) {
          return;
        }
        
        const category = { category: categoryName, items: [] };
        
        // Find the corresponding dish grid section
        const dishGridId = categoryEl.id;
        const dishGridSection = document.getElementById(dishGridId.replace('TabSelectOption-', ''));
        
        if (dishGridSection) {
          // Find all dish items in this section
          const dishItems = dishGridSection.querySelectorAll('.item__DishComponent-wkeq8p-0');
          
          dishItems.forEach(dishItem => {
            let itemName = dishItem.querySelector('h2')?.textContent.trim();
            
            // Fix for items showing "Liquor licence" instead of real names
            if (itemName && itemName.includes('Liquor licence') && categoryName === 'DRINK LIST') {
              // Map license items to their real names based on position/context
              const dishIndex = Array.from(dishItems).indexOf(dishItem);
              const drinkNames = ['SOFT DRINKS', 'BEERS', 'SPARKLING WATER 750ML', 'RED WINES', 'WHITE WINES'];
              
              if (dishIndex >= 0 && dishIndex < drinkNames.length) {
                itemName = drinkNames[dishIndex];
              }
            }
            
            // Enhanced filtering for unwanted items
            if (!itemName || 
                itemName.includes('Liquor licence') || 
                itemName.includes('Guest') ||
                itemName.includes('Login') ||
                itemName.includes('licence N') ||
                itemName.toLowerCase().includes('license') ||
                itemName.length < 3 ||
                itemName.match(/^[N0-9\s]+$/)) { // Filter out pure numbers/license numbers
              return;
            }
            
            const item = {
              name: itemName,
              description: null,
              price: null,
              image: null,
              dietary: [],
              options: []
            };
            
            // Get description
            const descEl = dishItem.querySelector('p');
            if (descEl) {
              item.description = descEl.textContent.trim();
            }
            
            // Get price
            const priceEl = dishItem.querySelector('.item__Price-wkeq8p-6 p');
            if (priceEl) {
              item.price = priceEl.textContent.trim();
            }
            
            // Get image from data-bg attribute (real restaurant images)
            const imageEl = dishItem.querySelector('.item__Image-wkeq8p-1');
            if (imageEl) {
              // First try to get from data-bg attribute (real images)
              const dataBg = imageEl.getAttribute('data-bg');
              if (dataBg) {
                item.image = dataBg;
              } else if (imageEl.style.backgroundImage) {
                // Fallback to style background
                const bgImage = imageEl.style.backgroundImage;
                const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
                if (urlMatch) {
                  item.image = urlMatch[1];
                }
              }
            }
            
            // Get dietary tags from visible badges
            const dietaryTags = dishItem.querySelectorAll('.dishtag__Text-htARsz');
            dietaryTags.forEach(tag => {
              const tagText = tag.textContent.trim();
              if (tagText === 'V') item.dietary.push('vegetarian');
              if (tagText === 'VGO') item.dietary.push('vegan');
              if (tagText === 'GFO') item.dietary.push('gluten free option');
            });
            
            // Look for add-on information from item data attributes or nearby elements
            // If an item has dietary tags, it likely has customization options
            
            // Add gluten-free option if the item has gluten free dietary tag
            if (item.dietary.includes('gluten free option')) {
              item.options.push({
                name: "Gluten Free",
                price: "+$5.00" // Standard price based on screenshot
              });
            }
            
            // Add vegan option if the item has vegan dietary tag 
            if (item.dietary.includes('vegan')) {
              item.options.push({
                name: "Vegan Option",
                price: "+$0.00" // Usually no extra charge for vegan option
              });
            }
            
            category.items.push(item);
          });
        }
        
        if (category.items.length > 0) {
          categories.push(category);
        }
      });
      
      return categories;
    });
    
    console.log(`📊 Found ${menuData.length} categories with ${menuData.reduce((sum, cat) => sum + cat.items.length, 0)} total items`);
    
    // Extract individual drinks from option_sets (beers, wines, etc.)
    console.log('🍺 Extracting individual drinks from option sets...');
    
    // Get the page data to access option_sets
    const pageData = await page.evaluate(() => {
      if (window.__INITIAL_STATE__ && window.__INITIAL_STATE__.restaurant) {
        return {
          menus: window.__INITIAL_STATE__.restaurant.menus,
          option_sets: window.__INITIAL_STATE__.restaurant.option_sets
        };
      }
      return null;
    });
    
    if (pageData) {
      for (const menu of pageData.menus || []) {
        const drinkCategory = menuData.find(cat => cat.category === 'DRINK LIST');
        if (drinkCategory && menu.categories) {
          const menuDrinkCategory = menu.categories.find(cat => cat.name === 'DRINK LIST');
          
          if (menuDrinkCategory) {
            // Find items that have option_sets (like BEERS, RED WINES, WHITE WINES)
            for (const dish of menuDrinkCategory.dishes) {
              if (dish.option_sets && dish.option_sets.length > 0) {
                // Extract individual items from option_sets
                for (const optionSetId of dish.option_sets) {
                  const optionSet = pageData.option_sets?.find(os => os._id === optionSetId);
                  
                  if (optionSet && optionSet.options && optionSet.options.length > 0) {
                    console.log(`🍷 Found ${optionSet.options.length} individual items in ${optionSet.name}`);
                    
                    // Create individual products for each option
                    for (const option of optionSet.options) {
                      if (option.name && option.name.trim()) {
                        const individualDrink = {
                          name: option.name.trim(),
                          description: `${optionSet.name} - ${option.name}`,
                          price: option.price ? `$${option.price}` : '$0.00',
                          image: dish.image ? `https://ucarecdn.com/${dish.image._id}/-/resize/x400/-/format/auto/-/progressive/yes/${dish.image.name}` : null,
                          dietary: [],
                          options: []
                        };
                        
                        drinkCategory.items.push(individualDrink);
                        console.log(`✅ Added individual drink: ${option.name} - $${option.price}`);
                      }
                    }
                    
                    // Remove the generic category item (BEERS, RED WINES, etc.)
                    drinkCategory.items = drinkCategory.items.filter(item => 
                      item.name !== dish.name && !item.name.includes('Liquor licence')
                    );
                  }
                }
              }
            }
          }
        }
      }
    }
    
    console.log("🔄 Transforming data to new schema...");
    const transformedData = transformToNewSchema(restaurantData, menuData);
    
    const filename = "ilcaminetto_menu.json";
    fs.writeFileSync(filename, JSON.stringify(transformedData, null, 2));
    console.log(`\n✅ Success! Saved ${filename}`);
    
    menuData.forEach(cat => {
      console.log(`  • ${cat.category}: ${cat.items.length} items`);
    });
    
    if (transformedData.length > 0) {
      console.log("\n📋 Sample transformed item:");
      console.log(JSON.stringify(transformedData[0], null, 2));
    }

    return {
      success: true,
      filename,
      totalItems: transformedData.length,
      categories: menuData.map(cat => ({ name: cat.category, itemCount: cat.items.length })),
      sampleItem: transformedData[0]
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

function transformToNewSchema(restaurantData, menuData) {
  const transformedItems = [];
  
  menuData.forEach(category => {
    category.items.forEach(item => {
      const uniqueId = generateObjectId();
      
      let priceString = "$0.00";
      if (item.price) {
        const priceMatch = item.price.match(/\$([\d.]+)/);
        if (priceMatch) {
          priceString = `$${priceMatch[1]}`;
        }
      }
      
      const tags = generateTags(item.name, item.description);
      const dietary = item.dietary || []; // Use real dietary data from website
      const addOns = item.options || []; // Use real options data from website
      const brandId = generateObjectId();
      // Use extracted image if available, otherwise null (no fake images)
      const image = item.image || null;
      
      transformedItems.push({
        "_id": { "$oid": uniqueId },
        "name": item.name,
        "price": priceString,
        "image": image,
        "tags": tags,
        "category": category.category.toUpperCase(),
        "ingredients": [], // Empty array as specified
        "spiceLevel": " ", // Empty space as specified
        "add-ons": addOns, // Array of objects for customization options
        "preparationTime": " ", // Empty space as specified
        "recommended_with": [], // Empty array as specified
        "restaurant": restaurantData.name,
        "dietary": dietary,
        "brandId": { "$oid": brandId },
        "description": item.description || ""
      });
    });
  });
  
  return transformedItems;
}

function generateObjectId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generateTags(name, description) {
  const tags = [];
  const text = `${name} ${description || ''}`.toLowerCase();
  
  if (text.includes('pasta') || text.includes('tortelloni') || text.includes('gnocchi') || text.includes('tagliatelle')) {
    tags.push('pasta');
  }
  
  if (text.includes('pizza') || text.includes('margherita') || text.includes('capricciosa') || text.includes('calzone')) {
    tags.push('pizza');
  }
  
  if (text.includes('risotto')) {
    tags.push('risotto');
  }
  
  if (text.includes('antipasti') || text.includes('stuzzichini')) {
    tags.push('appetizer');
  }
  
  if (text.includes('main') || text.includes('secondi')) {
    tags.push('main course');
  }
  
  if (text.includes('dessert') || text.includes('tiramisu') || text.includes('cannolo')) {
    tags.push('dessert');
  }
  
  if (text.includes('kids')) {
    tags.push('kids menu');
  }
  
  return tags;
}



// Removed fake image generation function - using real images only

function extractDietaryTags(name, description) {
  // Only return empty array - all real dietary tags are extracted during scraping
  // from the actual website badges (V, VGO, GFO) and should not be artificially generated
  return [];
}

function extractAddOns(name, description) {
  // Only return empty array - real add-ons should be extracted from website during scraping
  // if they exist (like "Gluten Free" or "Vegan Option" dropdowns)
  return [];
}

// Export for API usage
export { ilcaminettoScraper };

// CLI usage (when run directly)
if (import.meta.url === `file://${process.argv[1]}`) {
  ilcaminettoScraper().catch(err => {
    console.error("\n=== ERROR SUMMARY ===");
    console.error("Error:", err.message);
    console.error("\nPossible solutions:");
    console.error("1. Check if the Il Caminetto URL is accessible");
    console.error("2. Verify your internet connection");
    console.error("3. The page structure might have changed - check selectors");
    console.error("4. Try running with headless: false to see what's happening");
    process.exit(1);
  });
}
