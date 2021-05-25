import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatDialogRef } from '@angular/material/dialog';
import { ToasterService } from 'angular2-toaster';
import { Closed } from 'src/app/core/utils/closed';
import { ServerAPI } from 'src/app/core/core/api';
import { md5String } from 'src/app/core/utils/utils';
import { finalize, takeUntil } from 'rxjs/operators';
import { I18nService } from 'src/app/core/i18n/i18n.service';

@Component({
  selector: 'app-password',
  templateUrl: './password.component.html',
  styleUrls: ['./password.component.scss']
})
export class PasswordComponent implements OnInit, OnDestroy {
  disabled = false
  old = ''
  val = ''
  private closed_ = new Closed()
  constructor(private httpClient: HttpClient,
    private toasterService: ToasterService,
    private matDialogRef: MatDialogRef<PasswordComponent>,
    private i18nService: I18nService,
  ) { }
  ngOnInit(): void {
  }
  ngOnDestroy() {
    this.closed_.close()
  }
  onSave() {
    this.disabled = true
    ServerAPI.v1.features.sessions.child('password').post(this.httpClient,
      {
        'old': md5String(this.old),
        'value': md5String(this.val),
      },
    ).pipe(
      takeUntil(this.closed_.observable),
      finalize(() => {
        this.disabled = false
      })
    ).subscribe(() => {
      this.toasterService.pop('success', undefined, this.i18nService.get('password changed'))
    }, (e) => {
      this.toasterService.pop('error', undefined, e)
    })
  }
  onClose() {
    this.matDialogRef.close()
  }
}
