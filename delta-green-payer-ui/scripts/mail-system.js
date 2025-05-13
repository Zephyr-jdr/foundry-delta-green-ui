/**
 * Mail system for Delta Green Player UI
 */

import { DeltaGreenUI } from './delta-green-ui.js';

export class MailSystem {
  static messages = [];
  
  /**
   * Initialize mail system
   */
  static init() {
    console.log('Delta Green UI | Initializing mail system');
    
    // Load messages when interface is rendered
    Hooks.on('renderDeltaGreenUI', () => {
      console.log('Delta Green UI | Loading messages (renderDeltaGreenUI)');
      this.loadMessages();
    });
    
    // Initialize events
    this.initEvents();
  }
  
  /**
   * Initialize events
   */
  static initEvents() {
    // Handle input in message field
    $(document).on('keypress', '#dg-message-input', (e) => {
      if (e.which === 13 && !e.shiftKey) {
        e.preventDefault();
        const content = $('#dg-message-input').val();
        this.sendMessage(content);
        $('#dg-message-input').val('');
      }
    });
  }
  
  /**
   * Load messages from Foundry chat
   */
  static loadMessages() {
    // Get recent chat messages
    const chatMessages = game.messages.contents.slice(-50);
    
    // Convert to interface format
    this.messages = chatMessages.map(msg => {
      return {
        id: msg.id,
        sender: this.formatSenderName(msg.user),
        content: msg.content,
        timestamp: msg.timestamp
      };
    });
    
    // Display in interface
    this.displayMessages();
  }
  
  /**
   * Format sender name
   * @param {User} user - User who sent the message
   * @returns {string} Formatted name
   */
  static formatSenderName(user) {
    // If GM, display "Handler"
    if (user.isGM) {
      return "HANDLER";
    }
    
    // Otherwise, display player name
    return user.name.toUpperCase();
  }
  
  /**
   * Display messages in interface
   */
  static displayMessages() {
    const container = $('#dg-messages-container');
    container.empty();
    
    if (this.messages.length === 0) {
      container.append('<p>NO MESSAGES</p>');
      return;
    }
    
    // Add each message
    this.messages.forEach(msg => {
      const messageDiv = $(`<div class="dg-message"></div>`);
      
      // Determine name color based on user
      const user = game.users.find(u => {
        if (u.isGM && msg.sender === "HANDLER") return true;
        return u.name.toUpperCase() === msg.sender;
      });
      
      const color = user ? user.color : "#33ff33";
      
      // Add name and content
      messageDiv.append(`<div class="dg-message-sender" style="color: ${color}">${msg.sender}</div>`);
      messageDiv.append(`<div class="dg-message-content">${msg.content}</div>`);
      
      container.append(messageDiv);
    });
    
    // Scroll to bottom
    container.scrollTop(container[0].scrollHeight);
  }
  
  /**
   * Handle new chat message
   * @param {ChatLog} chatLog - Chat log
   * @param {string} messageText - Message text
   * @param {Object} chatData - Message data
   */
  static handleChatMessage(chatLog, messageText, chatData) {
    // Send message via Foundry chat system
    chatLog.processMessage(messageText, chatData);
    
    // Reload messages
    this.loadMessages();
  }
  
  /**
   * Render chat message
   * @param {ChatMessage} message - Message
   * @param {jQuery} html - HTML element
   * @param {Object} data - Message data
   */
  static renderChatMessage(message, html, data) {
    // Add message to list
    this.messages.push({
      id: message.id,
      sender: this.formatSenderName(message.user),
      content: message.content,
      timestamp: message.timestamp
    });
    
    // Update display
    this.displayMessages();
  }
  
  /**
   * Send message
   * @param {string} content - Message content
   */
  static sendMessage(content) {
    if (!content.trim()) return;
    
    // Create chat message
    ChatMessage.create({
      content: content,
      user: game.user.id,
      speaker: ChatMessage.getSpeaker()
    });
  }
}
