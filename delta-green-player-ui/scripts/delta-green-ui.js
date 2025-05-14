/**
 * Delta Green Player UI
 * Module for Foundry VTT creating a 90s CRT-style user interface
 * @author Zéphyr-JDR
 */

// Module imports
import { UIComponents } from './ui-components.js';
import { RecordsManager } from './records-manager.js';
import { MailSystem } from './mail-system.js';

/**
 * Main module class
 */
export class DeltaGreenUI {
  static ID = 'delta-green-payer-ui';
  
  /**
   * Module initialization
   */
  static init() {
    console.log('Delta Green UI | Initialization');
    
    // Register settings
    this.registerSettings();
    
    // Add login button
    this.addLoginButton();
    
    // Initialize hooks
    this.initHooks();
  }
  
  /**
   * Register module settings
   */
  static registerSettings() {
    game.settings.register(this.ID, 'uiWidth', {
      name: 'Interface Width',
      hint: 'Width of the CRT interface (% of window)',
      scope: 'client',
      config: true,
      type: Number,
      default: 90,
      range: {
        min: 50,
        max: 100,
        step: 5
      }
    });
    
    game.settings.register(this.ID, 'uiHeight', {
      name: 'Interface Height',
      hint: 'Height of the CRT interface (% of window)',
      scope: 'client',
      config: true,
      type: Number,
      default: 90,
      range: {
        min: 50,
        max: 100,
        step: 5
      }
    });
    
    game.settings.register(this.ID, 'zIndex', {
      name: 'Z-Index',
      hint: 'Z-index of the interface (higher values appear on top)',
      scope: 'client',
      config: true,
      type: Number,
      default: 9,
      range: {
        min: 1,
        max: 10000,
        step: 1
      }
    });
  }
  
  /**
   * Initialize Foundry hooks
   */
  static initHooks() {
    // Ready hook
    Hooks.on('ready', () => {
      this.onReady();
    });
    
    // Chat hook
    Hooks.on('chatMessage', (chatLog, messageText, chatData) => {
      if (this.isInterfaceActive()) {
        MailSystem.handleChatMessage(chatLog, messageText, chatData);
        return false; // Prevents normal message processing
      }
      return true;
    });
    
    // Chat message hook
    Hooks.on('renderChatMessage', (message, html, data) => {
      if (this.isInterfaceActive()) {
        MailSystem.renderChatMessage(message, html, data);
      }
    });
    
    // Actor hooks (records)
    Hooks.on('createActor', (actor, options, userId) => {
      console.log('Delta Green UI | New actor created, checking folder...');
      
      // Refresh immediately
      this.loadLastEntries();
      
      // Then refresh after a short delay to ensure the actor is properly associated with the folder
      setTimeout(() => {
        // Check again if the actor is in the PC Records folder
        const updatedActor = game.actors.get(actor.id);
        if (updatedActor && updatedActor.folder && updatedActor.folder.name === "PC Records") {
          console.log('Delta Green UI | Actor confirmed in PC Records, refreshing latest entries');
          this.loadLastEntries();
          this.forceDisplayLastEntries();
        }
      }, 500);
    });
    
    Hooks.on('updateActor', (actor, changes, options, userId) => {
      console.log('Delta Green UI | Actor updated, checking folder...');
      
      // Refresh immediately
      this.loadLastEntries();
      
      // Then refresh after a short delay to ensure the actor is properly associated with the folder
      setTimeout(() => {
        // Check again if the actor is in the PC Records folder
        const updatedActor = game.actors.get(actor.id);
        if (updatedActor && updatedActor.folder && updatedActor.folder.name === "PC Records") {
          console.log('Delta Green UI | Actor confirmed in PC Records, refreshing latest entries');
          this.loadLastEntries();
          this.forceDisplayLastEntries();
        }
      }, 500);
    });
    
    Hooks.on('deleteActor', (actor, options, userId) => {
      // Since the actor is already deleted, we can't check its folder
      // So we systematically refresh the latest entries
      console.log('Delta Green UI | Actor deleted, refreshing latest entries');
      this.loadLastEntries();
      
      // Force immediate display of entries after a short delay
      setTimeout(() => {
        console.log('Delta Green UI | Forcing display after actor deletion');
        this.loadLastEntries();
        this.forceDisplayLastEntries();
      }, 500);
    });
  }
  
  /**
   * Actions to perform when Foundry is ready
   */
  static onReady() {
    console.log('Delta Green UI | onReady');
    
    try {
      // Load templates
      console.log('Delta Green UI | Loading templates');
      this.loadTemplates().then(() => {
        console.log('Delta Green UI | Templates loaded successfully');
        
        // Initialize components
        console.log('Delta Green UI | Initializing components');
        UIComponents.init();
        RecordsManager.init();
        MailSystem.init();
        
        // Create folder for NPCs if it doesn't exist
        console.log('Delta Green UI | Creating PC Records folder if needed');
        this.createPCRecordsFolder().then(() => {
          console.log('Delta Green UI | PC Records folder check completed');
          
          // Immediate loading of latest entries
          console.log('Delta Green UI | Immediate loading of latest entries from onReady');
          this.loadLastEntries();
          
          // Render and automatically activate the interface for all users
          console.log('Delta Green UI | Rendering interface');
          this.renderInterface().then((success) => {
            if (success) {
              console.log('Delta Green UI | Interface rendered successfully, now activating');
              
              // Use setTimeout to ensure DOM is ready
              setTimeout(() => {
                console.log('Delta Green UI | Delayed activation of interface');
                
                // Check if container exists
                if ($('#dg-crt-container').length > 0) {
                  // Vérifier si l'utilisateur est un MJ
                  if (this.isGameMaster()) {
                    // Ne pas afficher automatiquement l'interface pour le MJ
                    console.log('Delta Green UI | GM detected, not showing interface automatically');
                    $('#dg-crt-container').hide();
                    game.user.setFlag(this.ID, 'interfaceActive', false);
                    $('body').removeClass('dg-crt-active');
                  } else {
                    // Afficher l'interface pour les joueurs normaux
                    console.log('Delta Green UI | Container found, showing it');
                    $('#dg-crt-container').show();
                    game.user.setFlag(this.ID, 'interfaceActive', true);
                    
                    // Add class to body to hide Foundry elements
                    $('body').addClass('dg-crt-active');
                    
                    // Load latest entries after interface rendering
                    console.log('Delta Green UI | Loading latest entries after interface rendering');
                    this.loadLastEntries();
                  }
                } else {
                  console.error('Delta Green UI | Container not found after rendering!');
                  ui.notifications.error("Error activating Delta Green UI interface");
                }
              }, 500);
            } else {
              console.error('Delta Green UI | Interface rendering failed');
            }
          }).catch(error => {
            console.error('Delta Green UI | Error rendering interface:', error);
            ui.notifications.error("Error rendering Delta Green UI interface");
          });
        }).catch(error => {
          console.error('Delta Green UI | Error creating PC Records folder:', error);
        });
      }).catch(error => {
        console.error('Delta Green UI | Error loading templates:', error);
      });
    } catch (error) {
      console.error('Delta Green UI | Error in onReady:', error);
      ui.notifications.error("Error initializing Delta Green UI");
    }
  }
  
  /**
   * Load Handlebars templates
   */
  static async loadTemplates() {
    console.log('Delta Green UI | Loading templates - START');
    
    try {
      const templatePaths = [
        `modules/${this.ID}/templates/records-view.html`,
        `modules/${this.ID}/templates/mail-view.html`,
        `modules/${this.ID}/templates/journal-view.html` // Ajout du template journal-view.html
      ];
      
      console.log('Delta Green UI | Template paths:', templatePaths);
      
      // Vérifier si les templates existent
      for (const path of templatePaths) {
        console.log(`Delta Green UI | Checking template: ${path}`);
        try {
          const response = await fetch(path);
          if (!response.ok) {
            console.error(`Delta Green UI | Template not found: ${path}`);
          } else {
            console.log(`Delta Green UI | Template found: ${path}`);
          }
        } catch (error) {
          console.error(`Delta Green UI | Error checking template: ${path}`, error);
        }
      }
      
      // Charger les templates
      console.log('Delta Green UI | Loading templates with loadTemplates()');
      const result = await loadTemplates(templatePaths);
      console.log('Delta Green UI | Templates loaded successfully');
      
      return result;
    } catch (error) {
      console.error('Delta Green UI | Error loading templates:', error);
      ui.notifications.error("Error loading Delta Green UI templates");
      return false;
    }
  }
  
  /**
   * Add login button to Foundry interface
   */
  static addLoginButton() {
    console.log('Delta Green UI | Adding login button');
    
    // Use renderSceneControls hook to ensure button is added after UI is ready
    Hooks.on('renderSceneControls', (app, html) => {
      console.log('Delta Green UI | renderSceneControls hook triggered');
      
      // Check if button already exists
      if ($('#dg-login-button').length === 0) {
        console.log('Delta Green UI | Creating login button');
        
        // Create button
        const loginButton = $('<button id="dg-login-button"></button>');
        loginButton.text(game.i18n.localize('DGUI.LogIn'));
        loginButton.click(() => this.openInterface());
        
        // Add button to interface
        $('body').append(loginButton);
        console.log('Delta Green UI | Login button added to body');
      } else {
        console.log('Delta Green UI | Login button already exists');
      }
    });
    
    // Add a backup hook in case renderSceneControls doesn't trigger
    Hooks.on('ready', () => {
      console.log('Delta Green UI | Adding login button via ready hook');
      
      // Wait a moment to ensure UI is fully loaded
      setTimeout(() => {
        if ($('#dg-login-button').length === 0) {
          console.log('Delta Green UI | Creating login button (delayed)');
          
          // Create button
          const loginButton = $('<button id="dg-login-button"></button>');
          loginButton.text(game.i18n.localize('DGUI.LogIn'));
          loginButton.click(() => this.openInterface());
          
          // Add button to interface
          $('body').append(loginButton);
          console.log('Delta Green UI | Login button added to body (delayed)');
        }
      }, 1000);
    });
  }
  
  /**
   * Open interface (only)
   */
  static openInterface() {
    console.log('Delta Green UI | Open Interface');
    
    const container = $('#dg-crt-container');
    
    // If interface doesn't exist yet, create it
    if (container.length === 0) {
      console.log('Delta Green UI | Interface container not found, creating it');
      this.renderInterface().then(() => {
        console.log('Delta Green UI | Interface rendered, now activating it');
        // Once interface is created, activate it
        $('#dg-crt-container').show();
        game.user.setFlag(this.ID, 'interfaceActive', true);
        
        // Add class to body to hide Foundry elements
        $('body').addClass('dg-crt-active');
        
        // Show login animation
        this.showLoginAnimation();
      }).catch(error => {
        console.error('Delta Green UI | Error rendering interface:', error);
        ui.notifications.error("Error rendering Delta Green UI interface");
      });
      return;
    }
    
    // If interface exists but is hidden, show it
    if (!container.is(':visible')) {
      console.log('Delta Green UI | Interface container exists but is hidden, showing it');
      container.show();
      game.user.setFlag(this.ID, 'interfaceActive', true);
      
      // Add class to body to hide Foundry elements
      $('body').addClass('dg-crt-active');
      
      // Show login animation
      this.showLoginAnimation();
      
      // Restart refresh interval
      if (!this.refreshIntervalId) {
        console.log('Delta Green UI | Restarting refresh interval');
        this.refreshIntervalId = setInterval(() => {
          if (this.isInterfaceActive()) {
            this.loadLastEntries();
            // Force immediate display without delay for smooth transition
            this.forceDisplayLastEntries();
          }
        }, 500); // Refresh interval (increased from 100ms to 500ms for better performance)
      }
    } else {
      console.log('Delta Green UI | Interface container is already visible');
    }
  }
  
  /**
   * Show login animation
   */
  static showLoginAnimation() {
    console.log('Delta Green UI | Showing login animation');
    
    // Hide the main interface during animation
    $('#dg-crt-screen').css('opacity', '0');
    
    // Show login animation
    const $loginAnimation = $('#dg-login-animation');
    $loginAnimation.show();
    
    // Initialize progress bar
    const $progressBar = $('#dg-login-progress-bar');
    $progressBar.css('width', '0%');
    
    // Animation steps timing (in ms)
    const steps = [
      { time: 0, progress: 0, message: 1 },
      { time: 800, progress: 16, message: 2 },
      { time: 1500, progress: 30, message: 3 },
      { time: 2300, progress: 46, message: 4 },
      { time: 3000, progress: 60, message: 5 },
      { time: 3800, progress: 76, message: 6 },
      { time: 4500, progress: 90, message: 6 },
      { time: 5000, progress: 100, message: 6 }
    ];
    
    // Execute each step
    steps.forEach(step => {
      setTimeout(() => {
        // Update progress bar
        $progressBar.css('width', `${step.progress}%`);
        
        // Show message if needed
        if (step.message) {
          $(`.dg-login-message[data-step="${step.message}"]`).addClass('active');
        }
        
        // Final step - hide animation and show interface
        if (step.time === 5000) {
          setTimeout(() => {
            $loginAnimation.css('animation', 'fadeOut 0.5s forwards');
            
            setTimeout(() => {
              $loginAnimation.hide();
              $('#dg-crt-screen').css('opacity', '1');
              
              // Force immediate display of entries
              this.forceDisplayLastEntries();
            }, 500);
          }, 500);
        }
      }, step.time);
    });
  }
  
  /**
   * Create folder for NPCs
   */
  static async createPCRecordsFolder() {
    // Check if folder already exists
    const folder = game.folders.find(f => f.name === "PC Records" && f.type === "Actor");
    
    // If folder doesn't exist, create it
    if (!folder) {
      await Folder.create({
        name: "PC Records",
        type: "Actor",
        parent: null,
        color: "#33ff33"
      });
      console.log('Delta Green UI | "PC Records" folder created');
    }
  }
  
  /**
   * Toggle interface
   * This method is used only by the LOG OUT button inside the interface
   */
  static toggleInterface() {
    console.log('Delta Green UI | Toggle Interface');
    
    const container = $('#dg-crt-container');
    
    // If interface doesn't exist yet, create it
    if (container.length === 0) {
      this.renderInterface().then(() => {
        // Once interface is created, activate it
        $('#dg-crt-container').show();
        game.user.setFlag(this.ID, 'interfaceActive', true);
      });
      return;
    }
    
    if (container.is(':visible')) {
      // Deactivation
      container.hide();
      
      // Store state
      game.user.setFlag(this.ID, 'interfaceActive', false);
      
      // Remove class from body to show Foundry elements
      $('body').removeClass('dg-crt-active');
      
      // Stop refresh interval to avoid glitches
      if (this.refreshIntervalId) {
        console.log('Delta Green UI | Stopping refresh interval');
        clearInterval(this.refreshIntervalId);
        this.refreshIntervalId = null;
      }
    } else {
      // Activation
      container.show();
      
      // Store state
      game.user.setFlag(this.ID, 'interfaceActive', true);
      
      // Add class to body to hide Foundry elements
      $('body').addClass('dg-crt-active');
      
      // Force immediate display of entries
      this.forceDisplayLastEntries();
      
      // Restart refresh interval
      if (!this.refreshIntervalId) {
        console.log('Delta Green UI | Restarting refresh interval');
        this.refreshIntervalId = setInterval(() => {
          if (this.isInterfaceActive()) {
            this.loadLastEntries();
            // Force immediate display without delay for smooth transition
            this.forceDisplayLastEntries();
          }
        }, 500); // Refresh interval (increased from 100ms to 500ms for better performance)
      }
    }
  }
  
  /**
   * Check if interface is active
   */
  static isInterfaceActive() {
    return game.user.getFlag(this.ID, 'interfaceActive') === true;
  }
  
  /**
   * Check if user is a gamemaster
   */
  static isGameMaster() {
    return game.user.isGM;
  }
  
  /**
   * Render main interface
   */
  static async renderInterface() {
    console.log('Delta Green UI | Rendering interface - START');
    
    try {
      // Get template
      console.log(`Delta Green UI | Loading template from modules/${this.ID}/templates/main-interface.html`);
      const template = await renderTemplate(`modules/${this.ID}/templates/main-interface.html`, {
        userId: game.user.id,
        playerName: game.user.name
      });
      
      console.log('Delta Green UI | Template loaded successfully, length:', template.length);
      
      // Check if container already exists and remove it to avoid duplicates
      if ($('#dg-crt-container').length > 0) {
        console.log('Delta Green UI | Container already exists, removing it');
        $('#dg-crt-container').remove();
      }
      
      // Add to Foundry interface
      console.log('Delta Green UI | Appending template to body');
      $('body').append(template);
      
      // Injecter le contenu des templates dans les divs correspondants
      try {
        console.log('Delta Green UI | Injecting templates into divs');
        
        // Récupérer le contenu des templates
        const recordsResponse = await fetch(`modules/${this.ID}/templates/records-view.html`);
        const mailResponse = await fetch(`modules/${this.ID}/templates/mail-view.html`);
        const journalResponse = await fetch(`modules/${this.ID}/templates/journal-view.html`);
        
        if (recordsResponse.ok) {
          const recordsContent = await recordsResponse.text();
          $('#dg-view-records').html(recordsContent);
          console.log('Delta Green UI | Records template injected');
        }
        
        if (mailResponse.ok) {
          const mailContent = await mailResponse.text();
          $('#dg-view-mail').html(mailContent);
          console.log('Delta Green UI | Mail template injected');
        }
        
        if (journalResponse.ok) {
          const journalContent = await journalResponse.text();
          $('#dg-view-journal').html(journalContent);
          console.log('Delta Green UI | Journal template injected');
        }
      } catch (error) {
        console.error('Delta Green UI | Error injecting templates:', error);
      }
      
      // Verify container was added
      if ($('#dg-crt-container').length === 0) {
        console.error('Delta Green UI | Container not found after append!');
        ui.notifications.error("Error creating Delta Green UI interface");
        return;
      }
      
      console.log('Delta Green UI | Container added successfully');
      
      // Apply settings
      const width = game.settings.get(this.ID, 'uiWidth');
      const height = game.settings.get(this.ID, 'uiHeight');
      const zIndex = game.settings.get(this.ID, 'zIndex');
      
      console.log(`Delta Green UI | Applying settings: width=${width}%, height=${height}%, zIndex=${zIndex}`);
      
      $('#dg-crt-container').css({
        width: `${width}%`,
        height: `${height}%`,
        top: `${(100 - height) / 2}%`,
        left: `${(100 - width) / 2}%`,
        zIndex: zIndex
      });
      
      // Initial hiding
      $('#dg-crt-container').hide();
      console.log('Delta Green UI | Container initially hidden');
      
      // Initialize interface events
      console.log('Delta Green UI | Initializing interface events');
      this.initInterfaceEvents();
      
      // Update agent name in Quick Access
      console.log('Delta Green UI | Updating agent name');
      this.updateAgentName();
      
      // Force display of entries by default
      console.log('Delta Green UI | Forcing display of entries');
      this.forceDisplayLastEntries();
      
      // Load latest entries
      console.log('Delta Green UI | Loading latest entries');
      this.loadLastEntries();
      
      // Load player list
      console.log('Delta Green UI | Loading player list');
      this.loadPlayersList();
      
      // Force display after a delay to ensure DOM is ready
      console.log('Delta Green UI | Setting up delayed force display');
      setTimeout(() => {
        console.log('Delta Green UI | Delayed force display triggered');
        this.forceDisplayLastEntries();
      }, 1000);
      
      // Stop old interval if it exists
      if (this.refreshIntervalId) {
        console.log('Delta Green UI | Stopping old refresh interval');
        clearInterval(this.refreshIntervalId);
      }
      
      // Create new refresh interval
      console.log('Delta Green UI | Creating new refresh interval');
      this.refreshIntervalId = setInterval(() => {
        // Check if interface is active before refreshing
        if (this.isInterfaceActive()) {
          console.log('Delta Green UI | Periodic refresh of entries');
          this.loadLastEntries();
          // Force immediate display without delay for smooth transition
          this.forceDisplayLastEntries();
        } else {
          console.log('Delta Green UI | Interface inactive, no refresh');
        }
      }, 500); // Refresh interval (increased from 100ms to 500ms for better performance)
      
      // Restore state - moved to the end to ensure everything is set up
      if (game.user.getFlag(this.ID, 'interfaceActive') === true) {
        console.log('Delta Green UI | Restoring active state');
        // Use setTimeout to ensure everything is ready
        setTimeout(() => {
          console.log('Delta Green UI | Delayed interface activation');
          this.openInterface();
        }, 500);
      }
      
      console.log('Delta Green UI | Rendering interface - END (Success)');
      return true;
    } catch (error) {
      console.error('Delta Green UI | Error rendering interface:', error);
      ui.notifications.error("Error rendering Delta Green UI interface");
      return false;
    }
  }
  
  /**
   * Initialize interface events
   */
  static initInterfaceEvents() {
    console.log('Delta Green UI | Initializing interface events');
    
    // Handle clicks on menu items (event delegation)
    $('#dg-crt-menu').on('click', '.dg-menu-item', function() {
      const view = $(this).data('view');
      console.log('Delta Green UI | Click on menu item:', view);
      
      if (view === 'logout') {
        console.log('Delta Green UI | Logout attempt via delegation');
        // Deactivate interface
        $('#dg-crt-container').hide();
        game.user.setFlag(DeltaGreenUI.ID, 'interfaceActive', false);
        return;
      }
      
      // Gestion spéciale pour settings
      if (view === 'settings') {
        console.log('Delta Green UI | Opening settings');
        // Ouvrir la fenêtre de configuration
        game.settings.sheet.render(true);
        return;
      }
      
      $('.dg-menu-item').removeClass('active');
      $(this).addClass('active');
      
      $('.dg-view').removeClass('active');
      $(`#dg-view-${view}`).addClass('active');
      
      // If in records view, load records
      if (view === 'records') {
        RecordsManager.loadRecords();
      }
      
      // If in mail view, load messages
      if (view === 'mail') {
        MailSystem.loadMessages();
      }
      
      // If in journal view, load journals
      if (view === 'journal') {
        console.log('Delta Green UI | Loading journals');
        DeltaGreenUI.loadJournals();
      }
    });
    
    // Direct handling of click on LOG OUT button
    $(document).on('click', '#dg-logout-button', function(e) {
      console.log('Delta Green UI | Direct click on LOG OUT button');
      e.preventDefault();
      e.stopPropagation();
      
      // Deactivate interface
      $('#dg-crt-container').hide();
      game.user.setFlag(DeltaGreenUI.ID, 'interfaceActive', false);
      
      // Remove class from body to show Foundry elements
      $('body').removeClass('dg-crt-active');
      
      // Stop refresh interval to avoid glitches
      if (DeltaGreenUI.refreshIntervalId) {
        console.log('Delta Green UI | Stopping refresh interval (via LOG OUT)');
        clearInterval(DeltaGreenUI.refreshIntervalId);
        DeltaGreenUI.refreshIntervalId = null;
      }
    });
    
    // Handle agent sheet view button
    $('#dg-view-agent-sheet').on('click', () => {
      const actor = game.user.character;
      if (actor) {
        actor.sheet.render(true);
      } else {
        ui.notifications.warn(game.i18n.localize('DGUI.NoCharacterAssigned'));
      }
    });
    
    // Player list click handling is now in UIComponents
    
    // Handle records search button
    $('#dg-search-records-btn').on('click', () => {
      $('.dg-menu-item[data-view="records"]').trigger('click');
    });
  }
  
  /**
   * Update agent name in Quick Access
   */
  static updateAgentName() {
    const actor = game.user.character;
    if (actor) {
      $('#dg-current-agent-name').text(actor.name);
    } else {
      $('#dg-current-agent-name').text('NO AGENT ASSIGNED');
    }
  }
  
  // Variable to store refresh interval ID
  static refreshIntervalId = null;
  
  /**
   * Force display of entries in "Last Entries" section
   * This method is used as a fallback if loadLastEntries() fails
   */
  static forceDisplayLastEntries() {
    console.log('Delta Green UI | Forcing display of latest entries');
    
    try {
      // Check if interface is active before continuing
      if (!this.isInterfaceActive()) {
        console.log('Delta Green UI | Interface not active, aborting force display');
        return;
      }
      
      // Find LAST ENTRIES section
      const $section = $('.dg-section').filter(function() {
        return $(this).find('.dg-section-title').text() === 'LAST ENTRIES';
      });
      
      if ($section.length) {
        console.log('Delta Green UI | LAST ENTRIES section found');
        
        // Find or create list
        let $list = $section.find('.dg-results-list');
        if (!$list.length) {
          console.log('Delta Green UI | List not found, creating new list');
          $section.append('<ul class="dg-results-list" id="dg-last-entries-list"></ul>');
          $list = $section.find('.dg-results-list');
        }
        
        // Normal style without debug border
        $list.css({padding: "10px", background: "#111"});
        
        // Check if list is empty
        if ($list.children().length === 0) {
          console.log('Delta Green UI | List empty, calling loadLastEntries()');
          // Instead of adding placeholders, call loadLastEntries()
          this.loadLastEntries();
        } else {
          console.log('Delta Green UI | List already contains entries, preserving');
        }
      } else {
        console.error('Delta Green UI | LAST ENTRIES section not found');
      }
    } catch (error) {
      console.error('Delta Green UI | Error forcing display of latest entries:', error);
    }
  }
  
  
  /**
   * Load player list
   */
  static loadPlayersList() {
    console.log('Delta Green UI | Loading player list');
    const $list = $('#dg-players-list');
    if (!$list.length) {
      console.log('Delta Green UI | Player list not found, calling UIComponents.updatePlayersList()');
      // If list doesn't exist yet, use UIComponents method
      UIComponents.updatePlayersList();
      return;
    }
    
    $list.empty();
    
    // Get active players (except GM)
    const players = game.users.filter(u => u.active && !u.isGM);
    
    if (players.length > 0) {
      players.forEach(player => {
        const characterName = player.character ? player.character.name : 'NO AGENT ASSIGNED';
        $list.append(`
          <li class="dg-result-item" data-user-id="${player.id}">
            ${player.name} - ${characterName}
          </li>
        `);
      });
    } else {
      $list.append('<li class="dg-result-item dg-no-entries">No active players found</li>');
    }
  }
  
  /**
   * Load journals
   */
  static loadJournals() {
    console.log('Delta Green UI | Loading journals');
    
    try {
      // Get journals list element
      const $list = $('#dg-journals-list');
      if (!$list.length) {
        console.error('Delta Green UI | Journals list not found');
        return;
      }
      
      // Clear list
      $list.empty();
      
      // Get all journals
      const journals = game.journal.contents;
      console.log('Delta Green UI | Found', journals.length, 'journals');
      
      if (journals.length === 0) {
        $list.append('<li class="dg-result-item dg-no-entries">No journals found</li>');
        return;
      }
      
      // Add journals to list
      journals.forEach(journal => {
        const $item = $(`<li class="dg-result-item" data-journal-id="${journal.id}">${journal.name}</li>`);
        $list.append($item);
        
        // Add click handler
        $item.on('click', function() {
          // Open journal sheet
          journal.sheet.render(true);
        });
      });
    } catch (error) {
      console.error('Delta Green UI | Error loading journals:', error);
      
      // In case of error, display error message
      const $list = $('#dg-journals-list');
      if ($list.length) {
        $list.empty().append('<li class="dg-result-item dg-no-entries">Error loading journals</li>');
      }
    }
  }
  
  /**
   * Load latest entries
   */
  static loadLastEntries() {
    console.log('Delta Green UI | Loading latest entries - START');
    
    try {
      // Direct test to check if element exists in DOM
      console.log("Delta Green UI | Test element:", document.getElementById("dg-last-entries-list"));
      
      // Get PC Records folder
      const folder = game.folders.find(f => f.name === "PC Records" && f.type === "Actor");
      console.log('Delta Green UI | PC Records folder found:', folder ? 'Yes' : 'No');
      
      // Update list
      let $list = $('#dg-last-entries-list');
      if (!$list.length) {
        console.error('Delta Green UI | Latest entries list not found in DOM');
        
        // Alternative search attempt
        console.log("Delta Green UI | Alternative search:", $(".dg-results-list").length, "lists found");
        
        // Attempt to create element if it doesn't exist
        console.log("Delta Green UI | Attempting to create missing element");
        
        // Check if section exists
        const $section = $('.dg-section').filter(function() {
          return $(this).find('.dg-section-title').text() === 'LAST ENTRIES';
        });
        
        if ($section.length) {
          console.log("Delta Green UI | LAST ENTRIES section found, adding list");
          $section.append('<ul class="dg-results-list" id="dg-last-entries-list"></ul>');
          $list = $('#dg-last-entries-list');
        } else {
          console.log("Delta Green UI | LAST ENTRIES section not found");
          
          // Force display in all result lists as a workaround
          $(".dg-results-list").each(function(index) {
            console.log(`Delta Green UI | Adding test content to list #${index}`);
            $(this).html("<li class='dg-result-item' style='color: red;'>TEST ENTRY - FORCED</li>");
          });
          
          return;
        }
      }
      
      // Normal style without debug border
      $list.css({padding: "10px", background: "#111"});
      
      console.log('Delta Green UI | Clearing latest entries list');
      $list.empty();
      
      // Array to store recent actors
      let recentActors = [];
      
      // Check if there are actors in PC Records folder
      if (!folder) {
        console.log('Delta Green UI | No PC Records folder, displaying "No recent entries found" message');
        $list.append('<li class="dg-result-item dg-no-entries">No recent entries found</li>');
        return;
      }
      
      // Get actors in folder (direct and reliable method)
      const allActors = game.actors.filter(a => a.folder && a.folder.id === folder.id);
      console.log('Delta Green UI | Total number of actors in PC Records folder:', allActors.length);
      
      // Display found actors for debugging
      allActors.forEach(a => console.log(`- ${a.name} (ID: ${a.id})`));
      
      if (allActors.length === 0) {
        // No actor found, display "No recent entries found" message
        console.log('Delta Green UI | No actor found in PC Records folder');
        $list.append('<li class="dg-result-item dg-no-entries">No recent entries found</li>');
        return;
      }
      
      // Sort by creation/modification date (most recent first)
      const sortedActors = [...allActors].sort((a, b) => {
        try {
          // Use ID as main sort source (often contains timestamp)
          const aId = a.id || '';
          const bId = b.id || '';
          
          // Extract numbers from ID for comparison
          const aNum = parseInt(aId.replace(/[^0-9]/g, '') || '0');
          const bNum = parseInt(bId.replace(/[^0-9]/g, '') || '0');
          
          console.log(`Delta Green UI | Comparison: Actor A (${a.name}): ${aNum}, Actor B (${b.name}): ${bNum}`);
          
          return bNum - aNum; // Descending order (most recent first)
        } catch (error) {
          console.error('Delta Green UI | Error sorting actors:', error);
          return 0; // In case of error, don't change order
        }
      });
      
      // Limit to last 3
      recentActors = sortedActors.slice(0, Math.min(3, sortedActors.length));
      console.log('Delta Green UI | Number of recent actors after sorting:', recentActors.length);
      
      // Add actors to list
      recentActors.forEach((actor, index) => {
        try {
          // Get record information safely
          let firstName = '';
          let lastName = '';
          
          try {
            firstName = actor.getFlag(DeltaGreenUI.ID, 'firstName') || '';
          } catch (e) {
            console.error('Delta Green UI | Error getting first name:', e);
          }
          
          try {
            lastName = actor.getFlag(DeltaGreenUI.ID, 'surname') || '';
          } catch (e) {
            console.error('Delta Green UI | Error getting last name:', e);
          }
          
          // Get surname (used as reference)
          let reference = '';
          try {
            reference = actor.getFlag(DeltaGreenUI.ID, 'surname') || 'UNKNOWN';
          } catch (e) {
            console.error('Delta Green UI | Error getting reference:', e);
            reference = 'UNKNOWN';
          }
          
          // Get name (stored in middleName)
          let middleName = '';
          try {
            middleName = actor.getFlag(DeltaGreenUI.ID, 'middleName') || '';
          } catch (e) {
            console.error('Delta Green UI | Error getting middle name:', e);
          }
          
          // If both are empty, use actor name
          if (!firstName && !reference) {
            console.log(`Delta Green UI | First name and surname empty for actor ${index + 1}, using actor name`);
            $list.append(`
              <li class="dg-result-item" data-actor-id="${actor.id}">
                ${actor.name}
              </li>
            `);
          } else {
            console.log(`Delta Green UI | Adding actor ${index + 1}: ${reference} - ${firstName} ${middleName}`);
            $list.append(`
              <li class="dg-result-item" data-actor-id="${actor.id}">
                ${reference} - ${firstName} ${middleName}
              </li>
            `);
          }
        } catch (error) {
          console.error(`Delta Green UI | Error adding actor ${index + 1}:`, error);
          // In case of error, add generic entry
          $list.append(`
            <li class="dg-result-item" data-actor-id="${actor.id}">
              ${actor.name || 'Unknown Record'}
            </li>
          `);
        }
      });
      
      // Handle clicks on entries
      $list.find('.dg-result-item[data-actor-id]').on('click', function() {
        const actorId = $(this).data('actor-id');
        const actor = game.actors.get(actorId);
        
        if (actor) {
          // Display case study form
          RecordsManager.showCaseStudyForm(actor);
        }
      });
      
      console.log('Delta Green UI | Loading latest entries - END');
    } catch (error) {
      console.error('Delta Green UI | Error loading latest entries:', error);
      
      // In case of error, display error message in list
      const $list = $('#dg-last-entries-list');
      if ($list.length) {
        $list.empty().append('<li class="dg-result-item dg-no-entries">Error loading entries</li>');
      }
    }
  }
}

// Module initialization
Hooks.once('init', () => {
  DeltaGreenUI.init();
});

// No need for separate '
