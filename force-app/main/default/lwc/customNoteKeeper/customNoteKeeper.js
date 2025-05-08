import { LightningElement, track, api, wire } from 'lwc';
import getNotes from '@salesforce/apex/NotesController.getNotes';
import createNote from '@salesforce/apex/NotesController.createNote';
import updateNote from '@salesforce/apex/NotesController.updateNote';
import { CurrentPageReference } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import noAssistance from '@salesforce/resourceUrl/NoAsisstentceSvg';
import getActiveUsers from '@salesforce/apex/NotesController.getActiveUsers';

export default class CustomNoteKeeper extends LightningElement {
    recordId;
    
    get noAssistanceIcon() {
        return noAssistance;
    }
    activeUsers = [];

    @wire(CurrentPageReference)
    getPageReference(pageRef) {
        if (pageRef && pageRef.state && pageRef.attributes.recordId) {
            this.recordId = pageRef.attributes.recordId;
        }
    }


    @wire(getActiveUsers)
    wiredActiveUsers({ error, data }) {
        if (data) {
            this.userOptions = data.map(user => ({
                label: user.Name, // Display user's Name in the combobox
                value: user.Id   // Store the user's Id as the value
            }));
            this.error = undefined; // Clear any previous errors
        } else if (error) {
            this.error = error; // Handle error
            this.userOptions = [];
        }
    }
    @track searchKey = '';
    @track selectedUserId = '';
    @track filteredNotes = [];
    @track allNotes = [];
    @track showModal = false;
    @track newRole = '';
    @track newNoteSubject = '';
    @track newNoteBody = '';
    @track selectedNoteId = null;
    @track modalTitle = 'New Note';
    @track modalButtonLabel = 'Create Note';
    @track recordName = 'Record'; // Update based on actual record name if available
    @track errorMessage = '';
    @track successMessage = '';
    @track showError = false;
    @track showSuccess = false;

    userOptions = [
        { label: 'All', value: '' },
        { label: 'Naruto Uzmaki', value: '005...' }
    ];

    buttonList = [
        { value: 'Processor', label: 'Processor', icon: 'action:submit_for_approval', baseClass: 'custom-green-icon' },
        { value: 'Loan Officer', label: 'Loan Officer', icon: 'action:new_case', baseClass: 'custom-orange-icon' },
        { value: 'Closer', label: 'Closer', icon: 'action:new_note', baseClass: 'custom-orange-icon' },
        { value: 'Loan Officer Assistant', label: 'Loan Officer Assistant', icon: 'action:user', baseClass: 'custom-blue-icon' },
        { value: 'Funder', label: 'Funder', icon: 'action:user', baseClass: 'custom-blue-icon' },
        { value: 'Owner', label: 'Owner', icon: 'action:user', baseClass: 'custom-blue-icon' },
        { value: 'Team Lead', label: 'Team Lead', icon: 'action:user', baseClass: 'custom-blue-icon' }
    ];

    selectedButtonsValues = [];

    get updatedButtonList() {
        return this.buttonList.map(btn => {
            return {
                ...btn,
                iconClass: this.selectedButtonsValues.includes(btn.value)
                    ? `${btn.baseClass} selected-button`
                    : btn.baseClass
            };
        });
    }

    connectedCallback() {
        getNotes({ recordId: this.recordId })
            .then(result => {
                this.allNotes = result;
                this.filteredNotes = result;
            })
            .catch(error => {
                this.showErrorMessage('Error fetching notes: ' + this.getErrorMessage(error));
            });
    }

    handleSearchKeyChange(event) {
        this.searchKey = event.target.value;
    }

    handleSearchEnter(event) {
        if (event.key === 'Enter') {
            this.applyFilters();
        }
    }

    handleUserFilterChange(event) {
        this.selectedUserId = event.detail.value;
        this.applyFilters();
    }

    handleButtonClick(event) {
        const value = event.currentTarget.dataset.value;
        console.log('role: '+value)
        this.newRole = value;
        const index = this.selectedButtonsValues.indexOf(value);
        if (index === -1) {
            this.selectedButtonsValues.push(value);
        } else {
            this.selectedButtonsValues.splice(index, 1);
        }
        this.selectedButtonsValues = [...this.selectedButtonsValues];
        
        if (this.showModal && !this.selectedNoteId) {
            this.newRole = this.selectedButtonsValues.join(', '); 
        console.log('this.newRole 108: '+this.newRole )

        }
        console.log('this.newRole 111: '+this.newRole )
        console.log('selectedButtonsValues '+this.selectedButtonsValues )

        this.newRole = this.selectedButtonsValues;
        this.applyFilters();
    }

    handleNewNoteClick() {
        this.showModal = true;
        this.modalTitle = 'New Note';
        this.modalButtonLabel = 'Create Note';
        // this.newRole = '';
        this.newNoteSubject = '';
        this.newNoteBody = '';
        this.selectedNoteId = null;
    }

    handleEditNoteClick(event) {
        const noteId = event.currentTarget.dataset.id;
        const note = this.allNotes.find(n => n.Id === noteId);
        if (note) {
            this.selectedNoteId = noteId;
            this.newNoteSubject = note.Subject;
            this.newNoteBody = note.Body;
            this.modalTitle = 'Edit Note';
            this.modalButtonLabel = 'Save Changes';
            this.showModal = true;
        }
    }

    handleCloseModal() {
        this.showModal = false;
        this.newNoteSubject = '';
        this.newNoteBody = '';
        this.selectedNoteId = null;
        this.modalTitle = 'New Note';
        this.modalButtonLabel = 'Create Note';
    }

    handleSubjectChange(event) {
        this.newNoteSubject = event.target.value;
    }

    handleBodyChange(event) {
        this.newNoteBody = event.target.value;
    }

    handleSaveNote() {
        const noteData = JSON.stringify({
            recordId: this.recordId,
            noteId: this.selectedNoteId,
            subject: this.newNoteSubject,
            body: this.newNoteBody,
            role: this.newRole
        });
        console.log('this.newRole : ',this.newRole);
        console.log('noteData : ',noteData);

        if (this.selectedNoteId) {
            // Update existing note
            updateNote({
                noteId: this.selectedNoteId,
                subject: this.newNoteSubject,
                body: this.newNoteBody,
                role: this.selectedButtonsValues.join(';') 

            })
                .then(updatedNote => {
                    this.allNotes = this.allNotes.map(note =>
                        note.Id === this.selectedNoteId ? updatedNote : note
                    );
                    this.applyFilters();
                    this.showSuccessMessage('Note updated successfully.');
                    this.handleCloseModal();
                })
                .catch(error => {
                    this.showErrorMessage('Error updating note: ' + this.getErrorMessage(error));
                });
        } else {
            // Create new note
            console.log('191: ',this.selectedButtonsValues.join(';'));
            createNote({
                recordId: this.recordId,
                subject: this.newNoteSubject,
                body: this.newNoteBody,
               role: this.selectedButtonsValues.join(';') 
            })
                .then(note => {
                    this.allNotes = [note, ...this.allNotes];
                    this.applyFilters();
                    this.showSuccessMessage('Note created successfully.');
                    this.handleCloseModal();
                })
                .catch(error => {
                    this.showErrorMessage('Error creating note: ' + this.getErrorMessage(error));
                });
        }
    }
    applyFilters() {
    const search = this.searchKey.toLowerCase();
    console.log('allNotes : ',JSON.stringify(this.allNotes));

    this.filteredNotes = this.allNotes.filter(note => {
    // console.log('note : ',JSON.stringify(note));

        const matchesSearch =
            (note.Subject || '').toLowerCase().includes(search) ||
            (note.Body || '').toLowerCase().includes(search);

        const matchesUser = this.selectedUserId ? note.OwnerId === this.selectedUserId : true;

        const noteRoles = note.Role ? note.Role.split(';') : [];

        const matchesRole = this.selectedButtonsValues.length === 0
            ? true
            : noteRoles.some(role => this.selectedButtonsValues.includes(role));

        return matchesSearch && matchesUser && matchesRole;
    });

    console.log('filteredNotes : ',JSON.stringify(this.filteredNotes));
}


    // applyFilters() {
    //     const search = this.searchKey.toLowerCase();
    //     this.filteredNotes = this.allNotes.filter(note => {
    //         const matchesSearch = (note.Subject || '').toLowerCase().includes(search) || (note.Body || '').toLowerCase().includes(search);
    //         const matchesUser = this.selectedUserId ? note.OwnerId === this.selectedUserId : true;

    //         const noteRoles = note.Role__c ? note.Role__c.split(';') : [];

    //         const matchesRole = this.selectedButtonsValues.length === 0
    //         return matchesSearch && matchesUser && matchesRole;
    //     });
    // }

    showErrorMessage(message) {
        this.errorMessage = message;
        this.showError = true;
        setTimeout(() => {
            this.showError = false;
            this.errorMessage = '';
        }, 5000);
    }

    showSuccessMessage(message) {
        this.successMessage = message;
        this.showSuccess = true;
        setTimeout(() => {
            this.showSuccess = false;
            this.successMessage = '';
        }, 5000);
    }

    getErrorMessage(error) {
        return error.body && error.body.message ? error.body.message : error.message || 'An unknown error occurred.';
    }
}