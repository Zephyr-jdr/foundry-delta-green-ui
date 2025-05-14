/**
 * UI Components for Delta Green Player UI
 */

import { DeltaGreenUI } from './delta-green-ui.js';
import { RecordsManager } from './records-manager.js';

export class UIComponents {
  /**
   * Initialize UI components
   */
  static init() {
    console.log('Delta Green UI | Initializing UI components');
    
    // Initialize events
    this.initEvents();
    
    // Update player list
    this.updatePlayersList();
  }
  
  /**
   * Initialize events
   */
  static initEvents() {
    // Handle clicks on player list items
    $(document).on('click', '#dg-players-list .dg-result-item', function() {
      const userId = $(this).data('user-id');
      if (!userId) return;
      
      const user = game.users.get(userId);
      if (!user || !user.character) return;
      
      // Open character sheet
      user.character.sheet.render(true);
    });
    
    // Handle clicks on record list items
    $(document).on('click', '#dg-all-records-list .dg-result-item', function() {
      const recordId = $(this).data('record-id');
      if (!recordId) return;
      
      // Open record
      RecordsManager.openRecord(recordId);
    });
    
    // Handle search button
    $(document).on('click', '#dg-search-button', function() {
      const searchTerm = $('#dg-search-input').val();
      RecordsManager.searchRecords(searchTerm);
    });
    
    // Handle search on Enter key
    $(document).on('keypress', '#dg-search-input', function(e) {
      if (e.which === 13) {
        const searchTerm = $(this).val();
        RecordsManager.searchRecords(searchTerm);
      }
    });
    
    // Handle add record button
    $(document).on('click', '#dg-add-record-button', function() {
      RecordsManager.showRecordForm();
    });
    
    // Handle save record button
    $(document).on('click', '#dg-save-record', function() {
      RecordsManager.saveRecord();
    });
    
    // Handle cancel record button
    $(document).on('click', '#dg-cancel-record', function() {
      RecordsManager.hideRecordForm();
    });
  }
  
  /**
   * Update players list
   */
  static updatePlayersList() {
    const $list = $('#dg-players-list');
    if (!$list.length) return;
    
    $list.empty();
    
    // Get active players (except GM)
    const players = game.users.filter(u => u.active && !u.isGM);
    
    if (players.length > 0) {
      players.forEach(player => {
        const characterName = player.character ? player.character.name : 'NO AGENT ASSIGNED';
        $list.append(`
          <li class="dg-result-item" data-user-id="${player.id}">
            <span style="color: ${player.color}">${player.name}</span> - ${characterName}
          </li>
        `);
      });
    } else {
      $list.append('<li class="dg-result-item dg-no-entries">No active players found</li>');
    }
  }
}
