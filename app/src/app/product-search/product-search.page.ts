import { Component } from '@angular/core';
import { ApiCallService } from '../services/api-call.service';
import { AlertController, Platform } from '@ionic/angular';
import { NavController } from '@ionic/angular';
import { BarcodeScanner } from '@ionic-native/barcode-scanner/ngx';
import * as moment from 'moment';

@Component({
  selector: 'app-product-search',
  templateUrl: './product-search.page.html',
  styleUrls: ['./product-search.page.scss'],
})
export class ProductSearchPage {

  public searching: boolean = true;
  public search_no_results: boolean = false;
  public empty_search: boolean = true;
  public items = [];

  public search_loading: boolean = false;
  public product_loading: boolean = false;
  public movement_loading: boolean = false;
  public forecast_loading: boolean = false;

  public current_tab = 'details';

  public item_code;
  public item;
  public movement = [];

  public is_cordova: boolean = false;

  constructor(private apiCall: ApiCallService, private alertController: AlertController, private navCtrl: NavController, private platform: Platform, private barcodeScanner: BarcodeScanner) {
    this.is_cordova = this.platform.is('cordova');
  }

  searchProduct(event) {
    const search_term = event.detail.value;
    if (search_term) {
      this.search_loading = true;
      this.searching = true;
      this.empty_search = false;
      this.apiCall.get('/products/', {search_term: search_term}).then((response: any) => {
        if (response.success) {
          this.items = response.data.products;
          if (this.items.length == 0) {
            this.search_no_results = true;
          } else {
            this.search_no_results = false;
          }
          this.search_loading = false;
        }
      });
    } else {
      this.items = [];
      this.empty_search = true;
      this.search_no_results = false;
    }
  }

  selectProduct(item_code) {
    this.item_code = item_code;
    this.downloadProduct();
    this.searching = false;
  }

  downloadProduct() {
    this.product_loading = true;
    this.movement_loading = true;
    this.forecast_loading = true;

    // Download product data
    this.apiCall.get('/products/' + this.item_code + '/', {}).then((response: any) => {
      if (response.success) {
        this.item = response.data.product;
        this.product_loading = false;
      }
    });

    // Download movement data
    this.apiCall.get('/products/' + this.item_code + '/movement/', {}).then((response: any) => {
      if (response.success) {

        this.movement = [];
        for (let item in response.data.product_movement) {
          this.movement.unshift({
            'date': moment(item),
            'inventory_amount': response.data.product_movement[item]
          });
        }
        this.movement_loading = false;
      }
    });

    // Download forecast data
    this.forecast_loading = false;
  }

  async addInventory(item_code) {
    const alert = await this.alertController.create({
      header: 'Add Inventory',
      inputs: [
        {
          name: 'amount',
          type: 'number',
        }
      ],
      buttons: [  
        {
          text: 'Add Inventory',
          handler: (data) => {
            if (data.amount) {
              let date_string = this.getDateTimeMySql();
              let unit_id = null;
              if (this.item.unit == 'Unit') {
                unit_id = 1;
              } else if (this.item.unit == 'Pound') {
                unit_id = 2;
              }
              this.apiCall.post('/inventory/', {
                'item_code': item_code,
                'amount': Number(data.amount),
                'unit': unit_id,
                'datetime': date_string
              }).then(() => {
                this.downloadProduct();
              });
            }
          }
        },
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            
          }
        } 
      ]
    });

    await alert.present();
  }

  getDateTimeMySql() {
    let date = new Date();
    let date_string = new Date().getUTCFullYear() + '-' +
      ('00' + (date.getUTCMonth()+1)).slice(-2) + '-' +
      ('00' + date.getUTCDate()).slice(-2) + ' ' + 
      ('00' + date.getUTCHours()).slice(-2) + ':' + 
      ('00' + date.getUTCMinutes()).slice(-2) + ':' + 
      ('00' + date.getUTCSeconds()).slice(-2);
    return date_string;
  }

  goBack() {
    this.navCtrl.navigateBack('product-search');
  }

  segmentChanged(value) {
    this.current_tab = value.detail.value;
  }

  scanBarcode() {
    this.barcodeScanner.scan().then(barcodeData => {
      this.searching = false;
      setTimeout
      this.current_tab = 'details';
      this.product_loading = true;
      this.apiCall.get('/products/', {barcode: barcodeData.text}).then((response: any) => {
        if (response.success) {
          if (response.data.products[0]) {
            this.item_code = response.data.products[0].item_code;
            this.downloadProduct();
          }
        }
      });
    });
  }
  
  searchFocused() {
    this.searching = true;
  }
}






