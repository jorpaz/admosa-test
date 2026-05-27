import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { AdminService } from '../../core/services/admin.service';
import { AdminUser, Area, ROLE_LABELS, Role, RoleCode } from '../../core/models';
import { formatDate } from '../../core/utils/helpers';

@Component({
  selector: 'app-admin',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly users = signal<AdminUser[]>([]);
  readonly areas = signal<Area[]>([]);
  readonly roles = signal<Role[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly roleLabels = ROLE_LABELS;
  readonly formatDate = formatDate;

  readonly displayedColumns = ['fullName', 'email', 'role', 'area', 'status', 'createdAt'];

  readonly createForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    roleCode: ['USER' as RoleCode, Validators.required],
    areaId: [''],
  });

  readonly selectedRole = signal<RoleCode>('USER');

  readonly isAreaRequired = computed(() => {
    const role = this.selectedRole();
    return role === 'USER' || role === 'CHIEF';
  });

  readonly showAreaField = computed(() => this.selectedRole() !== 'ADMIN');

  ngOnInit(): void {
    this.createForm.controls.roleCode.valueChanges.subscribe((role) => {
      this.selectedRole.set(role);
      const areaControl = this.createForm.controls.areaId;
      if (role === 'USER' || role === 'CHIEF') {
        areaControl.setValidators([Validators.required]);
      } else {
        areaControl.clearValidators();
        if (role === 'ADMIN') {
          areaControl.setValue('');
        }
      }
      areaControl.updateValueAndValidity();
    });
    this.selectedRole.set(this.createForm.controls.roleCode.value);
    this.createForm.controls.roleCode.updateValueAndValidity({ emitEvent: true });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.adminService.listUsers().subscribe({
      next: ({ users }) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.adminService.listAreas().subscribe(({ areas }) => this.areas.set(areas));
    this.adminService.listRoles().subscribe(({ roles }) => this.roles.set(roles));
  }

  createUser(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const raw = this.createForm.getRawValue();
    this.saving.set(true);

    this.adminService
      .createUser({
        email: raw.email,
        fullName: raw.fullName,
        password: raw.password,
        roleCode: raw.roleCode,
        areaId: raw.areaId || null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.createForm.reset({
            email: '',
            fullName: '',
            password: '',
            roleCode: 'USER',
            areaId: '',
          });
          this.snackBar.open('Usuario creado', 'OK', { duration: 3000 });
          this.reload();
        },
        error: (err) => {
          this.saving.set(false);
          const msg = err?.error?.error?.message ?? 'No se pudo crear el usuario';
          this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
        },
      });
  }

  toggleActive(user: AdminUser): void {
    this.adminService.updateUser(user.id, { isActive: !user.isActive }).subscribe({
      next: () => {
        this.snackBar.open('Usuario actualizado', 'OK', { duration: 2500 });
        this.reload();
      },
      error: () => this.snackBar.open('Error al actualizar', 'Cerrar', { duration: 4000 }),
    });
  }

  roleLabel(code: RoleCode): string {
    return this.roleLabels[code];
  }
}
