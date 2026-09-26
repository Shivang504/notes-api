import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { UserService } from 'src/user/user.service';
import bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verifyOtp.dto';

@Injectable()
export class AuthService {
  //need to use in each for logger
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  //register method
  async register(registerDto: RegisterDto) {
    //1 check email is already exits ---done
    //2 hashed password--done
    //3 create user --done
    //4 return jwt token --done

    const user = await this.userService.getUserByEmail(registerDto.email);

    if (user) {
      throw new ConflictException('Email already exists');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

    const newUser = this.userService.createUser({
      ...registerDto,
      password: hashedPassword,
    });

    this.logger.log(`User ${registerDto.email} registered successfully`);

    const payload = { sub: (await newUser).id, email: (await newUser).email };

    return {
      data: {
        name: (await newUser).name,
        email: (await newUser).email,
      },
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  // login method

  async login(loginDto: LoginDto) {
    // 1 check email is already exits
    // 2 compare password
    // return jwt token
    const user = await this.userService.getUserByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    const isPasswordMatch = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordMatch) {
      throw new UnauthorizedException('invalid credentials');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await this.userService.update(user.id, {
      otp,
      otpExpiredAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    // await this.mailService.sendMail({
    //   to: user.email,
    //   subject: 'Your Login OTP',
    //   text: `Your OTP is ${otp}`,
    // });

    this.logger.log(`OTP SEND to ${otp} successfully`);

    // return {
    //   data: {
    //     name: user.name,
    //     email: user.email,
    //     access_token: await this.jwtService.signAsync({
    //       sub: user.id,
    //       email: user.email,
    //     }),
    //   },
    // };

    return {
      message: 'OTP sent successfully',
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const user = await this.userService.getUserByEmail(verifyOtpDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 1. Check whether OTP exists
    if (!user.otp || !user.otpExpiredAt) {
      throw new UnauthorizedException('OTP not found');
    }

    // 2. Check whether OTP matches
    if (verifyOtpDto.otp !== user.otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // 3. Check OTP expiry
    if (new Date() > user.otpExpiredAt) {
      throw new UnauthorizedException('OTP expired');
    }

    // 4. Clear OTP after successful verification
    await this.userService.update(user.id, {
      otp: null,
      otpExpiredAt: null,
    });

    // 5. Generate JWT
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      data: {
        name: user.name,
        email: user.email,
        access_token: accessToken,
      },
    };
  }
}
