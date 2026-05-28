from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='perfilusuario',
            name='username_display',
            field=models.CharField(blank=True, max_length=50, null=True, unique=True, verbose_name='Nombre de usuario'),
        ),
        migrations.AddField(
            model_name='perfilusuario',
            name='plan',
            field=models.CharField(choices=[('free', 'Free'), ('pro', 'Pro'), ('enterprise', 'Enterprise')], default='free', max_length=20),
        ),
        migrations.AddField(
            model_name='perfilusuario',
            name='fecha_inicio_plan',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='perfilusuario',
            name='fecha_fin_plan',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='perfilusuario',
            name='email_verificado',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='perfilusuario',
            name='token_verificacion',
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name='perfilusuario',
            name='fecha_token',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='perfilusuario',
            name='activo',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='perfilusuario',
            name='fecha_registro',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name='perfilusuario',
            name='ultimo_acceso',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
